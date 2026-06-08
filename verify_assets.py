import os
import sys

# avatars.js와 동기화된 데이터 구조
SKIN_COLORS_COUNT = 5 # skin1 ~ skin5
HAIR_COLORS_COUNT = 5 # color1 ~ color5
HAIR_STYLES = ["short", "curly", "neat", "spiky", "bald"] # bald는 생략됨
ACCESSORIES = ["none", "cap", "helmet", "scar", "blush"] # none은 생략됨
EYES = ["calm", "sharp", "smile", "cool", "fierce"]
FACE_SHAPES = ["round", "square", "vshape"]

def verify_all_asset_combinations():
    dest_dir = "assets/img"
    missing_files = set()
    tested_combinations = 0
    pose = "bat"
    
    print("Starting exhaustive asset combination verification...")

    # 1. 고정 장비 에셋 존재 여부 먼저 검사
    fixed_assets = [
        "face-features.webp"
    ]
    for lvl in range(1, 4):
        fixed_assets.append(f"eq-cleats-lvl{lvl}-{pose}.webp")
        fixed_assets.append(f"eq-glove-lvl{lvl}-{pose}.webp")
        fixed_assets.append(f"eq-bat-lvl{lvl}-{pose}.webp")
        
    for asset in fixed_assets:
        path = os.path.join(dest_dir, asset)
        if not os.path.exists(path):
            missing_files.add(path)

    # 2. 모든 커스터마이징 선택지의 순열 조합 검증
    # 총 조합 수: 5 (피부색) * 5 (머리색) * 5 (헤어스타일) * 5 (액세서리) * 5 (눈모양) * 3 (얼굴형) = 9,375개 조합
    for skin_idx in range(1, SKIN_COLORS_COUNT + 1):
        for hair_color_idx in range(1, HAIR_COLORS_COUNT + 1):
            for style in HAIR_STYLES:
                for acc in ACCESSORIES:
                    for eye in EYES:
                        for shape in FACE_SHAPES:
                            tested_combinations += 1
                            
                            # 해당 조합에서 렌더링에 사용되는 모든 부품 레이어 경로 도출
                            layers = []
                            
                            # (0) 몸통 바탕 레이어
                            layers.append(f"body-bat-skin{skin_idx}.webp")
                            
                            # (1) 뒷머리 레이어
                            if style != "bald" and style != "none":
                                layers.append(f"hair-back-{style}-color{hair_color_idx}.webp")
                                
                            # (2) 얼굴형 레이어
                            layers.append(f"head-{shape}-skin{skin_idx}.webp")
                            
                            # (3) 눈모양 레이어
                            layers.append(f"eye-{eye}.webp")
                            
                            # (4) 앞머리 레이어
                            if style != "bald" and style != "none":
                                layers.append(f"hair-front-{style}-color{hair_color_idx}.webp")
                                
                            # (5) 액세서리 레이어
                            if acc != "none" and acc is not None:
                                layers.append(f"acc-{acc}.webp")

                            # 각 레이어 파일의 실존 여부 확인
                            for layer_file in layers:
                                full_path = os.path.join(dest_dir, layer_file)
                                if not os.path.exists(full_path):
                                    missing_files.add(full_path)

    print(f"Exhaustive test finished. Tested {tested_combinations} custom avatar combinations.")
    
    if missing_files:
        print("\n[FAIL] VERIFICATION FAILED! Missing assets detected:")
        for missing in sorted(missing_files):
            print(f"  - {missing}")
        return False
    else:
        print("\n[SUCCESS] VERIFICATION PASSED! All 9,375 custom avatar combinations are fully valid and no assets are missing.")
        return True

if __name__ == '__main__':
    success = verify_all_asset_combinations()
    if not success:
        sys.exit(1)
