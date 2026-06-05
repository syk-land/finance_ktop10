import os

def clean_project():
    # List of temporary/unnecessary files to delete
    files_to_remove = [
        "probe-career.mjs",
        "probe-regression.mjs",
        "probe.mjs",
        "create_sample_assets.py"
    ]
    
    cleaned_count = 0
    for file in files_to_remove:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"Cleaned: {file}")
                cleaned_count += 1
            except Exception as e:
                print(f"Failed to delete {file}: {e}")
                
    if cleaned_count == 0:
        print("No temporary files found. Project is already clean.")
    else:
        print(f"Successfully cleaned {cleaned_count} temporary files.")

if __name__ == '__main__':
    clean_project()
