# 现行：42 种玩家倾向人物图

使用内置 imagegen 重新生成，继续沿用蓝发、蓝白裙装、鲸尾的像素鲸鱼娘。按原表 G001–G042 的行为特点设计道具，不把负面行为画成坏人，也不为附加标签创建主类型人物。

- `dist/assets/whale-types-01.png`：G001–G014。
- `dist/assets/whale-types-02.png`：G015–G028。
- `dist/assets/whale-types-03.png`：G029–G042。

每张为 1254 × 1254 的 RGBA 精灵图，4 × 4 格；前 14 格按行排列，最后两格留空。页面和 PNG 分享卡从同一原图读取对应格子。完整的共同画风与逐角色提示词保存在 `content/art-prompts.json`。

主类型编号、中文名称和图格索引由 `scripts/build-content.py` 一起生成，避免只换名字却沿用旧人物。旧版 16 型图暂留作历史素材，不用于新版结果。

---

## 历史记录：旧 16 型

# GameBTI 鲸鱼娘像素形象

素材：`dist/assets/whale-girls.png`，1254 × 1254，RGBA 透明 PNG。

使用内置 imagegen 生成一张 4 × 4 精灵图，按 `GameData.types` 的顺序排列：INTJ、INTP、ENTJ、ENTP、INFJ、INFP、ENFJ、ENFP、ISTJ、ISFJ、ESTJ、ESFJ、ISTP、ISFP、ESTP、ESFP。前端通过 SVG viewBox 显示单格，PNG 人格卡通过 Canvas 从同一张原图裁取对应单格，不另外维护一份图片。

生成提示词：

> A transparent, perfectly regular 4 × 4 pixel-art sprite atlas of 16 full-body DeepSeek-inspired chibi whale-girl variants. Long cobalt blue hair, navy anime eyes, white frilly maid headband with whale-fin hair ornaments, modest blue-and-white frilly maid dress with apron, white stockings, blue shoes and prominent curled blue whale tail in every cell. Crisp 16-bit Japanese RPG pixel clusters; consistent proportions and scale; centered in equal square cells. No text, grid, labels, borders, gradients or background. In reading order: strategist with glasses and tactics book; scientist with goggles and cyan potion; captain with officer cap and pointing pose; inventor with wrench and lightbulb; storykeeper with moon brooch and book; dreamer with flower hairpin and flower; guild leader with cape and heart; cheerful gamer with headphones and controller; organized player with square glasses and checklist; support with medical satchel and potion; expedition leader with cap and map; organizer with megaphone; quiet player with hairclip and controller; painter with beret, brush and palette; adventurer with visor and cyan toy sword; superstar with crown and microphone. Preserve the same blue-haired whale-girl identity throughout, not a whale animal, squid or orange block mascot.

此图为为本站生成的同人风格视觉素材。
