import os
import glob
from PIL import Image

def scale_hair_assets():
    dest_dir = "assets/img"
    canvas_w, canvas_h = 420, 562
    XC, YC = 210, 123
    new_XC, new_YC = 210, 225
    scale_factor = 2.27 # SD 머리 크기로 확대

    # 1. 대상 머리카락 파일 목록 확보 (앞머리 + 뒷머리 총 50종)
    hair_files = glob.glob(os.path.join(dest_dir, "hair-front-*.webp")) + \
                 glob.glob(os.path.join(dest_dir, "hair-back-*.webp"))
                 
    print(f"Found {len(hair_files)} hair assets to scale.")

    for file_path in hair_files:
        img = Image.open(file_path).convert("RGBA")
        
        # 2. 중심(XC, YC) 기준 스케일업 기하 정렬
        new_w = int(canvas_w * scale_factor)
        new_h = int(canvas_h * scale_factor)
        
        # 2.27배 리사이즈
        scaled_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # 캔버스의 새로운 중심과 스케일업된 이미지의 예전 중심을 일치시키기 위한 크롭 영역 계산
        crop_left = int(XC * scale_factor - new_XC)
        crop_top = int(YC * scale_factor - new_YC)
        crop_right = crop_left + canvas_w
        crop_bottom = crop_top + canvas_h
        
        # 크롭 후 새로운 420x562 캔버스에 안착
        final_canvas = scaled_img.crop((crop_left, crop_top, crop_right, crop_bottom))
        
        # 3. WebP로 덮어쓰기
        final_canvas.save(file_path, "WEBP", quality=95)
        print(f"Successfully scaled: {os.path.basename(file_path)}")

if __name__ == '__main__':
    scale_hair_assets()
