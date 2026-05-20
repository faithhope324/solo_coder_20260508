import numpy as np
from scipy.optimize import linear_sum_assignment


def iou(bbox1, bbox2):
    x1_1, y1_1, x2_1, y2_1 = bbox1
    x1_2, y1_2, x2_2, y2_2 = bbox2
    
    x1_i = max(x1_1, x1_2)
    y1_i = max(y1_1, y1_2)
    x2_i = min(x2_1, x2_2)
    y2_i = min(y2_1, y2_2)
    
    inter_area = max(0, x2_i - x1_i) * max(0, y2_i - y1_i)
    
    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    
    union_area = area1 + area2 - inter_area
    
    if union_area == 0:
        return 0.0
    
    return inter_area / union_area


def iou_cost(tracks, detections):
    cost_matrix = np.zeros((len(tracks), len(detections)), dtype=np.float32)
    for i, track in enumerate(tracks):
        for j, detection in enumerate(detections):
            cost_matrix[i, j] = 1.0 - iou(track.bbox, detection[0])
    return cost_matrix


def linear_assignment(cost_matrix, threshold):
    if cost_matrix.size == 0:
        return np.empty((0, 2), dtype=int), np.arange(cost_matrix.shape[0]), np.arange(cost_matrix.shape[1])
    
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    matches = []
    unmatched_tracks = []
    unmatched_detections = []
    
    for row, col in zip(row_ind, col_ind):
        if cost_matrix[row, col] <= threshold:
            matches.append((row, col))
        else:
            unmatched_tracks.append(row)
            unmatched_detections.append(col)
    
    for row in range(cost_matrix.shape[0]):
        if row not in row_ind:
            unmatched_tracks.append(row)
    
    for col in range(cost_matrix.shape[1]):
        if col not in col_ind:
            unmatched_detections.append(col)
    
    return np.array(matches, dtype=np.int32), np.array(unmatched_tracks, dtype=np.int32), np.array(unmatched_detections, dtype=np.int32)


def gate_cost_matrix(tracks, detections, gated_cost=None, lambda_value=0.2):
    if gated_cost is None:
        gated_cost = np.ones((len(tracks), len(detections))) * lambda_value
    
    cost_matrix = gated_cost
    
    return cost_matrix
