import os
from PIL import Image

def process_all_eyes():
    raw_dir = "C:/Users/exbxda13/.gemini/antigravity-cli/brain/1050161c-0458-4b87-856a-4b598076e06f"
    dest_dir = "assets/img"
    canvas_w, canvas_h = 420, 562
    eyes = ["calm", "sharp", "smile", "cool", "fierce"]

    import glob

    for eye in eyes:
        files = glob.glob(os.path.join(raw_dir, f"asset_raw_eye_{eye}_*.png"))
        if not files:
            print(f"Raw eye file for {eye} not found. Skipping.")
            continue
        src_file = sorted(files)[-1]
        dest_file = os.path.join(dest_dir, f"eye-{eye}.webp")

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

        # 캐릭터 머리 크기에 알맞게 리사이즈
        # 눈의 가로 크기를 약 68픽셀, 세로는 비율 유지로 리사이즈
        target_w = 68
        aspect = img.size[1] / img.size[0]
        target_h = int(target_w * aspect)
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

        # 5. 420x562 빈 투명 캔버스 생성 및 붙여넣기
        # 눈 중심을 (210, 215)으로 맞추기
        pos_x = int(210 - target_w / 2)
        pos_y = int(215 - target_h / 2)
        
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        canvas.paste(img, (pos_x, pos_y), mask=img)

        # 6. 최종 WebP 저장
        canvas.save(dest_file, "WEBP", quality=95)
        print(f"Successfully processed: {dest_file} at pos {(pos_x, pos_y)}")

if __name__ == '__main__':
    process_all_eyes()
