import numpy as np
from text_region_processor import TextRegionProcessor


def test_iou_calculation():
    print("测试 IoU 计算...")
    box1 = [0, 0, 100, 100]
    box2 = [50, 50, 150, 150]
    iou = TextRegionProcessor.calculate_iou(box1, box2)
    expected = 2500 / (10000 + 10000 - 2500)
    assert abs(iou - expected) < 0.001, f"IoU 计算错误: {iou} != {expected}"
    print(f"  IoU 计算通过: {iou:.4f}")

    box3 = [200, 200, 300, 300]
    iou2 = TextRegionProcessor.calculate_iou(box1, box3)
    assert iou2 == 0.0, f"非重叠区域 IoU 应为 0: {iou2}"
    print(f"  非重叠区域 IoU 计算通过: {iou2}")
    print("✓ IoU 计算测试通过\n")


def test_overlap_merging():
    print("测试重叠区域合并...")
    regions = [
        {
            "bbox": [0, 0, 100, 50],
            "polygon": [[0, 0], [100, 0], [100, 50], [0, 50]],
            "text": "出口",
            "confidence": 0.95,
            "center_x": 50,
            "center_y": 25,
            "width": 100,
            "height": 50
        },
        {
            "bbox": [10, 5, 110, 55],
            "polygon": [[10, 5], [110, 5], [110, 55], [10, 55]],
            "text": "出口",
            "confidence": 0.85,
            "center_x": 60,
            "center_y": 30,
            "width": 100,
            "height": 50
        },
        {
            "bbox": [200, 0, 300, 50],
            "polygon": [[200, 0], [300, 0], [300, 50], [200, 50]],
            "text": "入口",
            "confidence": 0.92,
            "center_x": 250,
            "center_y": 25,
            "width": 100,
            "height": 50
        }
    ]

    merged = TextRegionProcessor.merge_overlapping_regions(regions, iou_threshold=0.3)
    assert len(merged) == 2, f"合并后区域数量应为 2: {len(merged)}"
    assert merged[0]["merged_count"] == 2, f"第一个区域应合并 2 个: {merged[0]['merged_count']}"
    assert merged[0]["confidence"] == 0.95, f"应保留最高置信度: {merged[0]['confidence']}"
    print(f"  合并前: {len(regions)} 个区域")
    print(f"  合并后: {len(merged)} 个区域")
    print(f"  区域1: {merged[0]['text']} (合并 {merged[0]['merged_count']} 个, 置信度 {merged[0]['confidence']})")
    print(f"  区域2: {merged[1]['text']} (合并 {merged[1]['merged_count']} 个, 置信度 {merged[1]['confidence']})")
    print("✓ 重叠区域合并测试通过\n")


def test_region_sorting():
    print("测试文字区域排序...")
    image_height = 600
    regions = [
        {
            "bbox": [300, 200, 400, 240],
            "polygon": [[300, 200], [400, 200], [400, 240], [300, 240]],
            "text": "第三行",
            "confidence": 0.9,
            "center_x": 350,
            "center_y": 220,
            "width": 100,
            "height": 40
        },
        {
            "bbox": [100, 100, 200, 140],
            "polygon": [[100, 100], [200, 100], [200, 140], [100, 140]],
            "text": "第一行中",
            "confidence": 0.9,
            "center_x": 150,
            "center_y": 120,
            "width": 100,
            "height": 40
        },
        {
            "bbox": [0, 100, 80, 140],
            "polygon": [[0, 100], [80, 100], [80, 140], [0, 140]],
            "text": "第一行左",
            "confidence": 0.9,
            "center_x": 40,
            "center_y": 120,
            "width": 80,
            "height": 40
        },
        {
            "bbox": [220, 100, 300, 140],
            "polygon": [[220, 100], [300, 100], [300, 140], [220, 140]],
            "text": "第一行右",
            "confidence": 0.9,
            "center_x": 260,
            "center_y": 120,
            "width": 80,
            "height": 40
        },
        {
            "bbox": [100, 300, 200, 340],
            "polygon": [[100, 300], [200, 300], [200, 340], [100, 340]],
            "text": "第四行",
            "confidence": 0.9,
            "center_x": 150,
            "center_y": 320,
            "width": 100,
            "height": 40
        },
        {
            "bbox": [100, 160, 200, 200],
            "polygon": [[100, 160], [200, 160], [200, 200], [100, 200]],
            "text": "第二行",
            "confidence": 0.9,
            "center_x": 150,
            "center_y": 180,
            "width": 100,
            "height": 40
        }
    ]

    sorted_regions = TextRegionProcessor.sort_text_regions(regions, image_height)
    expected_order = ["第一行左", "第一行中", "第一行右", "第二行", "第三行", "第四行"]
    actual_order = [r["text"] for r in sorted_regions]

    assert actual_order == expected_order, f"排序顺序错误: {actual_order} != {expected_order}"
    print(f"  排序后顺序:")
    for i, r in enumerate(sorted_regions):
        print(f"    {i+1}. {r['text']} (center_y={r['center_y']:.0f}, center_x={r['center_x']:.0f})")
    print("✓ 文字区域排序测试通过\n")


def test_full_processing():
    print("测试完整处理流程...")
    image_height = 600
    regions = [
        {
            "bbox": [5, 5, 95, 45],
            "polygon": [[5, 5], [95, 5], [95, 45], [5, 45]],
            "text": "欢迎",
            "confidence": 0.88,
            "center_x": 50,
            "center_y": 25,
            "width": 90,
            "height": 40
        },
        {
            "bbox": [0, 0, 100, 50],
            "polygon": [[0, 0], [100, 0], [100, 50], [0, 50]],
            "text": "欢迎",
            "confidence": 0.95,
            "center_x": 50,
            "center_y": 25,
            "width": 100,
            "height": 50
        },
        {
            "bbox": [300, 100, 400, 150],
            "polygon": [[300, 100], [400, 100], [400, 150], [300, 150]],
            "text": "餐厅",
            "confidence": 0.92,
            "center_x": 350,
            "center_y": 125,
            "width": 100,
            "height": 50
        },
        {
            "bbox": [100, 100, 200, 150],
            "polygon": [[100, 100], [200, 100], [200, 150], [100, 150]],
            "text": "菜单",
            "confidence": 0.90,
            "center_x": 150,
            "center_y": 125,
            "width": 100,
            "height": 50
        }
    ]

    processed = TextRegionProcessor.process_regions(regions, image_height, iou_threshold=0.3)
    assert len(processed) == 3, f"处理后应有 3 个区域: {len(processed)}"
    assert processed[0]["text"] == "欢迎", f"第一个区域应为欢迎: {processed[0]['text']}"
    assert processed[0]["merged_count"] == 2, f"欢迎应合并 2 个区域: {processed[0]['merged_count']}"
    assert processed[1]["text"] == "菜单", f"第二个区域应为菜单: {processed[1]['text']}"
    assert processed[2]["text"] == "餐厅", f"第三个区域应为餐厅: {processed[2]['text']}"

    print(f"  输入: {len(regions)} 个区域")
    print(f"  输出: {len(processed)} 个区域")
    for i, r in enumerate(processed):
        print(f"    {i+1}. {r['text']} (合并 {r.get('merged_count', 1)} 个, 置信度 {r['confidence']:.2f})")
    print("✓ 完整处理流程测试通过\n")


def test_translator_mock():
    print("测试翻译模块 (Mock)...")
    from translator import Translator
    translator = Translator()

    test_cases = [
        ("你好", "Hello"),
        ("出口", "Exit"),
        ("餐厅", "Restaurant"),
        ("菜单", "Menu"),
        ("未知词汇", "[未知词汇]"),
    ]

    for original, expected in test_cases:
        translated = translator.translate(original)
        assert translated == expected, f"翻译错误: {original} -> {translated} != {expected}"
        print(f"  {original} -> {translated} ✓")

    print("✓ 翻译模块测试通过\n")


def test_image_annotator():
    print("测试图片标注器...")
    from image_annotator import ImageAnnotator

    annotator = ImageAnnotator()
    print(f"  字体路径: {annotator.font_path or '使用默认字体'}")
    print(f"  预设颜色数量: {len(annotator.colors)}")

    test_image = np.ones((400, 600, 3), dtype=np.uint8) * 255
    regions = [
        {
            "bbox": [50, 50, 150, 100],
            "polygon": [[50, 50], [150, 50], [150, 100], [50, 100]],
            "text": "出口",
            "confidence": 0.95,
            "center_x": 100,
            "center_y": 75,
            "width": 100,
            "height": 50
        },
        {
            "bbox": [300, 200, 450, 260],
            "polygon": [[300, 200], [450, 200], [450, 260], [300, 260]],
            "text": "欢迎光临",
            "confidence": 0.90,
            "center_x": 375,
            "center_y": 230,
            "width": 150,
            "height": 60
        }
    ]
    translations = ["Exit", "Welcome"]

    annotated = annotator.annotate_image(test_image, regions, translations)
    assert annotated.shape == test_image.shape, f"标注后图片尺寸改变: {annotated.shape} != {test_image.shape}"
    print(f"  输入图片尺寸: {test_image.shape}")
    print(f"  输出图片尺寸: {annotated.shape}")

    comparison = annotator.create_comparison_image(test_image, annotated)
    expected_width = test_image.shape[1] * 2 + 10
    expected_height = max(test_image.shape[0], annotated.shape[0])
    assert comparison.shape[1] == expected_width, f"对比图宽度错误: {comparison.shape[1]} != {expected_width}"
    assert comparison.shape[0] == expected_height, f"对比图高度错误: {comparison.shape[0]} != {expected_height}"
    print(f"  对比图尺寸: {comparison.shape}")
    print("✓ 图片标注器测试通过\n")


def run_all_tests():
    print("=" * 60)
    print("场景文字识别与翻译系统 - 核心算法测试")
    print("=" * 60)
    print()

    try:
        test_iou_calculation()
        test_overlap_merging()
        test_region_sorting()
        test_full_processing()
        test_translator_mock()
        test_image_annotator()

        print("=" * 60)
        print("✓ 所有测试通过！")
        print("=" * 60)
    except AssertionError as e:
        print(f"✗ 测试失败: {e}")
        raise
    except Exception as e:
        print(f"✗ 发生错误: {e}")
        raise


if __name__ == "__main__":
    run_all_tests()
