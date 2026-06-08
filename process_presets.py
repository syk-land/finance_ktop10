import os
import glob
from PIL import Image

def process_sd_presets():
    raw_dir = "C:/Users/exbxda13/.gemini/antigravity-cli/brain/1050161c-0458-4b87-856a-4b598076e06f"
    dest_dir = "assets/img"
    canvas_w, canvas_h = 420, 562

    presets = [
        {"key": "bat-f1", "raw_prefix": "asset_raw_char_bat_f1_"},
        {"key": "pitch-f1", "raw_prefix": "asset_raw_char_pitch_f1_"},
        {"key": "bat-f2", "raw_prefix": "asset_raw_char_bat_f2_"},
        {"key": "pitch-f2", "raw_prefix": "asset_raw_char_pitch_f2_"},
        {"key": "bat-f3", "raw_prefix": "asset_raw_char_bat_f3_"},
        {"key": "pitch-f3", "raw_prefix": "asset_raw_char_pitch_f3_"},
        {"key": "bat-f4", "raw_prefix": "asset_raw_char_bat_f4_"},
        {"key": "pitch-f4", "raw_prefix": "asset_raw_char_pitch_f4_"}
    ]

    for preset in presets:
        files = glob.glob(os.path.join(raw_dir, preset["raw_prefix"] + "*.png"))
        if not files:
            print(f"Raw file for {preset['key']} not found. Skipping.")
            continue
        src_file = sorted(files)[-1]
        dest_file = os.path.join(dest_dir, f"char-{preset['key']}.webp")

        # 1. 이미지 로드
        img = Image.open(src_file).convert("RGBA")
        datas = img.getdata()

        # 2. 크로마키 (RGB 240 이상 투명화)
        new_data = []
        for item in datas:
            if item[0] >= 240 and item[1] >= 240 and item[2] >= 240:
                new_data.append((0, 0, 0, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)

        # 3. 오토크롭
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)

        # 4. 전신 캔버스 크기에 맞게 세로 기준 리사이즈
        # 세로를 530px로 맞춰서 아래쪽에 살짝 여유를 줌
        target_h = 530
        aspect = img.size[0] / img.size[1]
        target_w = int(target_h * aspect)
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

        # 5. 420x562 캔버스 하단 중앙 배치
        pos_x = int(canvas_w / 2 - target_w / 2)
        pos_y = canvas_h - target_h - 10 # 바닥에서 10px 위로 띄움
        
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        canvas.paste(img, (pos_x, pos_y), mask=img)

        # WebP 저장
        canvas.save(dest_file, "WEBP", quality=95)
        print(f"Successfully processed SD preset: {dest_file} at pos {(pos_x, pos_y)}")

if __name__ == '__main__':
    process_sd_presets()
