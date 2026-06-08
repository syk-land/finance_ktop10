import os
from PIL import Image

def process_accessories():
    raw_dir = "C:/Users/exbxda13/.gemini/antigravity-cli/brain/1f988a5f-3552-410b-a2aa-a4b07a8131b4"
    dest_dir = "assets/img"
    canvas_w, canvas_h = 420, 562

    specs = {
        "helmet": {
            "src": os.path.join(raw_dir, "asset_raw_helmet_1780633253478.png"),
            "dest": os.path.join(dest_dir, "acc-helmet.webp"),
            "size": (190, 172),
            "pos": (115, 92)
        },
        "cap": {
            "src": os.path.join(raw_dir, "asset_raw_cap_1780633270569.png"),
            "dest": os.path.join(dest_dir, "acc-cap.webp"),
            "size": (168, 154),
            "pos": (126, 31)
        },
        "glasses": {
            "src": os.path.join(raw_dir, "asset_raw_glasses_1780633287499.png"),
            "dest": os.path.join(dest_dir, "acc-glasses.webp"),
            "size": (145, 51),
            "pos": (137, 189)
        }
    }

    for key, spec in specs.items():
        if not os.path.exists(spec["src"]):
            print(f"Source file not found: {spec['src']}")
            continue
            
        img = Image.open(spec["src"]).convert("RGBA")
        
        # 헬멧의 경우 3x3 격자 이미지이므로 정중앙 헬멧만 미리 크롭
        if key == "helmet":
            img = img.crop((320, 320, 704, 704))
        # 안경의 경우 하단 설명 텍스트 영역 제외하고 안경 본체만 크롭
        elif key == "glasses":
            img = img.crop((0, 0, 1024, 620))
            
        datas = img.getdata()

        # 크로마키 누끼 따기 (RGB 240 이상을 투명화)
        new_data = []
        for item in datas:
            if item[0] >= 240 and item[1] >= 240 and item[2] >= 240:
                new_data.append((0, 0, 0, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)

        # 오토크롭
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)

        # 리사이즈
        img = img.resize(spec["size"], Image.Resampling.LANCZOS)

        # 캔버스에 배치
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        canvas.paste(img, spec["pos"], mask=img)

        canvas.save(spec["dest"], "WEBP", quality=95)
        print(f"Successfully processed and saved: {spec['dest']}")

if __name__ == '__main__':
    process_accessories()
