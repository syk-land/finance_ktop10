import os
import glob
from PIL import Image

SKIN_COLORS = ["#ecc7a1", "#e6b889", "#f0c89b", "#e3b07a", "#eccfa9"]
XC, YC = 210, 225

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)

def replace_skin_color(img, target_hex):
    # skin1의 기준 색상: 살구색 #ecc7a1
    base_rgb = (236, 199, 161)
    target_rgb = hex_to_rgb(target_hex)
    
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []
    
    base_sum = sum(base_rgb)
    
    for item in datas:
        r, g, b, a = item
        if a < 10:
            new_data.append(item)
            continue
            
        # 검은 외곽선이나 아주 어두운 영역은 그대로 유지
        if r < 80 and g < 80 and b < 80:
            new_data.append(item)
            continue
            
        # 피부 영역 감지 (붉은빛이 돌고 밝은 영역)
        # 카툰 이미지 특성상 피부색은 R > G > B 관계를 가짐
        if r > g and g > b and r > 100:
            # 픽셀의 밝기 비율 보존 변환
            pixel_sum = r + g + b
            factor = pixel_sum / base_sum if base_sum > 0 else 1.0
            
            # 너무 밝아지거나 어두워지는 현상 완화 (클램핑)
            factor = max(0.7, min(1.3, factor))
            
            nr = max(0, min(255, int(target_rgb[0] * factor)))
            ng = max(0, min(255, int(target_rgb[1] * factor)))
            nb = max(0, min(255, int(target_rgb[2] * factor)))
            new_data.append((nr, ng, nb, a))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    return img

def process_all_heads():
    raw_dir = "C:/Users/exbxda13/.gemini/antigravity-cli/brain/1050161c-0458-4b87-856a-4b598076e06f"
    dest_dir = "assets/img"
    canvas_w, canvas_h = 420, 562
    shapes = ["round", "square", "vshape"]

    for shape in shapes:
        files = glob.glob(os.path.join(raw_dir, f"asset_raw_head_{shape}_*.png"))
        if not files:
            print(f"Raw head file for {shape} not found. Skipping.")
            continue
        src_file = sorted(files)[-1]

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

        # 4. 캐릭터 머리 크기에 알맞게 리사이즈
        # 귀 포함 가로 약 150 픽셀 (SD 캐릭터 대두 비율)
        target_w = 150
        aspect = img.size[1] / img.size[0]
        target_h = int(target_w * aspect)
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

        # 5. 5단계 피부색 배리에이션 생성 및 저장
        for s_idx, skin_color in enumerate(SKIN_COLORS):
            # 피부색 치환 적용
            colored_head = replace_skin_color(img, skin_color)
            
            # 캔버스에 배치 (머리 중심 XC, YC에 얼굴 중심 정렬)
            pos_x = int(XC - target_w / 2)
            pos_y = int(YC - target_h / 2)
            
            canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
            canvas.paste(colored_head, (pos_x, pos_y), mask=colored_head)

            # 저장
            dest_file = os.path.join(dest_dir, f"head-{shape}-skin{s_idx + 1}.webp")
            canvas.save(dest_file, "WEBP", quality=95)
            print(f"Successfully processed: {dest_file} at pos {(pos_x, pos_y)}")

if __name__ == '__main__':
    process_all_heads()
