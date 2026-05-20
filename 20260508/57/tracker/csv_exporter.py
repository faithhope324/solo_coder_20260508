import csv
from typing import Dict, Any, List
from pathlib import Path


def export_results_to_csv(results: Dict[str, Any], output_path: str) -> None:
    tracks = results.get('tracks', {})
    counts = results.get('counts', {})
    total_counts = results.get('total_counts', {})
    video_info = results.get('video_info', {})
    frames = results.get('frames', [])
    
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        
        writer.writerow(['=== 视频信息 ==='])
        writer.writerow(['宽度(像素)', video_info.get('width', '')])
        writer.writerow(['高度(像素)', video_info.get('height', '')])
        writer.writerow(['帧率(FPS)', video_info.get('fps', '')])
        writer.writerow(['总帧数', video_info.get('total_frames', '')])
        writer.writerow(['时长(秒)', round(video_info.get('duration', 0), 2)])
        writer.writerow([])
        
        writer.writerow(['=== 进出计数统计 ==='])
        writer.writerow(['类别', '进入数量', '离开数量', '总计'])
        for class_name, class_counts in counts.items():
            writer.writerow([
                class_name,
                class_counts.get('in', 0),
                class_counts.get('out', 0),
                class_counts.get('total', 0)
            ])
        writer.writerow([
            '总计',
            total_counts.get('in', 0),
            total_counts.get('out', 0),
            total_counts.get('total', 0)
        ])
        writer.writerow([])
        
        writer.writerow(['=== 跟踪目标详情 ==='])
        writer.writerow([
            '跟踪ID', '类别', '出现帧', '消失帧',
            '轨迹点数量', '中心点坐标(首帧)', '中心点坐标(末帧)'
        ])
        for track_id_str, track_data in tracks.items():
            trajectory = track_data.get('trajectory', [])
            first_point = trajectory[0] if trajectory else ['', '']
            last_point = trajectory[-1] if trajectory else ['', '']
            writer.writerow([
                track_id_str,
                track_data.get('class_name', ''),
                track_data.get('start_frame', ''),
                track_data.get('end_frame', ''),
                len(trajectory),
                f"({round(first_point[0], 1)}, {round(first_point[1], 1)})",
                f"({round(last_point[0], 1)}, {round(last_point[1], 1)})"
            ])
        writer.writerow([])
        
        writer.writerow(['=== 逐帧检测结果 ==='])
        writer.writerow([
            '帧号', '时间戳(秒)', '跟踪ID', '类别', '置信度',
            '边界框(x1,y1,x2,y2)'
        ])
        for frame_data in frames:
            frame_number = frame_data.get('frame_number', '')
            timestamp = round(frame_data.get('timestamp', 0), 3)
            detections = frame_data.get('detections', [])
            
            for det in detections:
                bbox = det.get('bbox', [])
                bbox_str = f"({round(bbox[0], 1)}, {round(bbox[1], 1)}, {round(bbox[2], 1)}, {round(bbox[3], 1)})" if bbox else ''
                writer.writerow([
                    frame_number,
                    timestamp,
                    det.get('track_id', ''),
                    det.get('class_name', ''),
                    round(det.get('confidence', 0), 3),
                    bbox_str
                ])


def export_tracks_to_csv(tracks: Dict[str, Any], output_path: str) -> None:
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['跟踪ID', '类别', '出现帧', '消失帧', '轨迹点数量'])
        
        for track_id_str, track_data in tracks.items():
            writer.writerow([
                track_id_str,
                track_data.get('class_name', ''),
                track_data.get('start_frame', ''),
                track_data.get('end_frame', ''),
                len(track_data.get('trajectory', []))
            ])


def export_frames_to_csv(frames: List[Dict[str, Any]], output_path: str) -> None:
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['帧号', '时间戳(秒)', '跟踪ID', '类别', '置信度', 'x1', 'y1', 'x2', 'y2'])
        
        for frame_data in frames:
            frame_number = frame_data.get('frame_number', '')
            timestamp = round(frame_data.get('timestamp', 0), 3)
            detections = frame_data.get('detections', [])
            
            for det in detections:
                bbox = det.get('bbox', [0, 0, 0, 0])
                writer.writerow([
                    frame_number,
                    timestamp,
                    det.get('track_id', ''),
                    det.get('class_name', ''),
                    round(det.get('confidence', 0), 3),
                    round(bbox[0], 1),
                    round(bbox[1], 1),
                    round(bbox[2], 1),
                    round(bbox[3], 1)
                ])
