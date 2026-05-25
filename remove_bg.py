from PIL import Image
import os

def force_transparent(img_path):
    if not os.path.exists(img_path):
        return
    print("Forcing transparency on", img_path)
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # Aggressive threshold to destroy the white square
        if item[0] >= 190 and item[1] >= 190 and item[2] >= 190:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    img.save(img_path, "PNG")

force_transparent('assets/spider_hero.png')
force_transparent('assets/characters/jedi_kid.png')
force_transparent('assets/bounty_hunter.png')
force_transparent('assets/enemies/thug.png')
force_transparent('assets/enemies/trooper.png')
