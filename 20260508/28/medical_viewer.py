import sys
import numpy as np
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QSlider, QLabel, QGridLayout, QFrame)
from PyQt5.QtCore import Qt
import pyvista as pv
from pyvistaqt import QtInteractor


def generate_mock_dicom_data(shape=(64, 64, 64)):
    x, y, z = np.ogrid[:shape[0], :shape[1], :shape[2]]
    cx, cy, cz = shape[0] // 2, shape[1] // 2, shape[2] // 2
    
    data = np.zeros(shape, dtype=np.float32)
    
    brain_mask = ((x - cx) ** 2) / (cx ** 2) + \
                 ((y - cy) ** 2) / (cy ** 2) + \
                 ((z - cz) ** 2) / (cz ** 2) < 0.8
    
    data[brain_mask] = 30 + np.random.normal(0, 5, brain_mask.sum())
    
    ventricle_mask = ((x - cx) ** 2) / (15 ** 2) + \
                     ((y - cy) ** 2) / (10 ** 2) + \
                     ((z - cz) ** 2) / (15 ** 2) < 1.0
    data[ventricle_mask] = 10 + np.random.normal(0, 3, ventricle_mask.sum())
    
    tumor_mask = ((x - (cx + 15)) ** 2) / (8 ** 2) + \
                 ((y - (cy - 10)) ** 2) / (6 ** 2) + \
                 ((z - cz) ** 2) / (10 ** 2) < 1.0
    data[tumor_mask] = 60 + np.random.normal(0, 8, tumor_mask.sum())
    
    skull_mask = ((x - cx) ** 2) / (cx ** 2) + \
                 ((y - cy) ** 2) / (cy ** 2) + \
                 ((z - cz) ** 2) / (cz ** 2) < 0.9
    skull_mask = skull_mask & ~brain_mask
    data[skull_mask] = 80 + np.random.normal(0, 10, skull_mask.sum())
    
    data = np.clip(data, 0, 100)
    return data


class MedicalViewer(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("医学图像切片查看器 - 三维正交视图")
        self.resize(1400, 900)
        
        self.volume_data = generate_mock_dicom_data((64, 64, 64))
        self.shape = self.volume_data.shape
        self.axial_idx = self.shape[2] // 2
        self.sagittal_idx = self.shape[0] // 2
        self.coronal_idx = self.shape[1] // 2
        
        self.setup_ui()
        self.setup_viewers()
        self.update_all_slices()
    
    def setup_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(10)
        
        viewers_layout = QGridLayout()
        viewers_layout.setSpacing(8)
        
        self.axial_frame = self.create_viewer_frame("横断面 (Axial)")
        self.sagittal_frame = self.create_viewer_frame("矢状面 (Sagittal)")
        self.coronal_frame = self.create_viewer_frame("冠状面 (Coronal)")
        
        viewers_layout.addWidget(self.axial_frame, 0, 0)
        viewers_layout.addWidget(self.sagittal_frame, 0, 1)
        viewers_layout.addWidget(self.coronal_frame, 1, 0)
        
        control_panel = self.create_control_panel()
        viewers_layout.addWidget(control_panel, 1, 1)
        
        main_layout.addLayout(viewers_layout, 1)
    
    def create_viewer_frame(self, title):
        frame = QFrame()
        frame.setFrameShape(QFrame.StyledPanel)
        frame.setFrameShadow(QFrame.Raised)
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(5, 5, 5, 5)
        layout.setSpacing(5)
        
        title_label = QLabel(title)
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("font-weight: bold; font-size: 14px; padding: 5px;")
        layout.addWidget(title_label)
        
        return frame
    
    def create_control_panel(self):
        panel = QFrame()
        panel.setFrameShape(QFrame.StyledPanel)
        panel.setFrameShadow(QFrame.Raised)
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(15)
        
        title = QLabel("控制面板")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("font-weight: bold; font-size: 16px;")
        layout.addWidget(title)
        
        self.axial_label = QLabel(f"横断面位置: {self.axial_idx} / {self.shape[2] - 1}")
        self.axial_slider = QSlider(Qt.Horizontal)
        self.axial_slider.setRange(0, self.shape[2] - 1)
        self.axial_slider.setValue(self.axial_idx)
        self.axial_slider.valueChanged.connect(self.on_axial_changed)
        layout.addWidget(self.axial_label)
        layout.addWidget(self.axial_slider)
        
        self.sagittal_label = QLabel(f"矢状面位置: {self.sagittal_idx} / {self.shape[0] - 1}")
        self.sagittal_slider = QSlider(Qt.Horizontal)
        self.sagittal_slider.setRange(0, self.shape[0] - 1)
        self.sagittal_slider.setValue(self.sagittal_idx)
        self.sagittal_slider.valueChanged.connect(self.on_sagittal_changed)
        layout.addWidget(self.sagittal_label)
        layout.addWidget(self.sagittal_slider)
        
        self.coronal_label = QLabel(f"冠状面位置: {self.coronal_idx} / {self.shape[1] - 1}")
        self.coronal_slider = QSlider(Qt.Horizontal)
        self.coronal_slider.setRange(0, self.shape[1] - 1)
        self.coronal_slider.setValue(self.coronal_idx)
        self.coronal_slider.valueChanged.connect(self.on_coronal_changed)
        layout.addWidget(self.coronal_label)
        layout.addWidget(self.coronal_slider)
        
        intensity_title = QLabel("当前位置灰度值")
        intensity_title.setStyleSheet("font-weight: bold;")
        layout.addWidget(intensity_title)
        
        self.intensity_label = QLabel("移动鼠标查看灰度值")
        self.intensity_label.setStyleSheet("background-color: #f0f0f0; padding: 10px; border-radius: 5px;")
        self.intensity_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.intensity_label)
        
        info_title = QLabel("数据信息")
        info_title.setStyleSheet("font-weight: bold;")
        layout.addWidget(info_title)
        
        info_text = QLabel(
            f"数据维度: {self.shape[0]} x {self.shape[1]} x {self.shape[2]}\n"
            f"数据类型: 模拟DICOM\n"
            f"灰度范围: 0 - 100"
        )
        info_text.setStyleSheet("background-color: #e8f4f8; padding: 10px; border-radius: 5px;")
        layout.addWidget(info_text)
        
        layout.addStretch()
        return panel
    
    def setup_viewers(self):
        self.axial_plotter = QtInteractor(self.axial_frame)
        self.axial_frame.layout().addWidget(self.axial_plotter)
        self.axial_plotter.set_background("black")
        
        self.sagittal_plotter = QtInteractor(self.sagittal_frame)
        self.sagittal_frame.layout().addWidget(self.sagittal_plotter)
        self.sagittal_plotter.set_background("black")
        
        self.coronal_plotter = QtInteractor(self.coronal_frame)
        self.coronal_frame.layout().addWidget(self.coronal_plotter)
        self.coronal_plotter.set_background("black")
        
        self.axial_plotter.add_text("横断面", position="upper_left", font_size=10, color="white")
        self.sagittal_plotter.add_text("矢状面", position="upper_left", font_size=10, color="white")
        self.coronal_plotter.add_text("冠状面", position="upper_left", font_size=10, color="white")
        
        self.axial_plotter.enable_trackball_style()
        self.sagittal_plotter.enable_trackball_style()
        self.coronal_plotter.enable_trackball_style()
        
        self.axial_plotter.add_key_event("i", lambda: self.update_intensity_display(self.axial_plotter, "axial"))
        self.sagittal_plotter.add_key_event("i", lambda: self.update_intensity_display(self.sagittal_plotter, "sagittal"))
        self.coronal_plotter.add_key_event("i", lambda: self.update_intensity_display(self.coronal_plotter, "coronal"))
    
    def on_axial_changed(self, value):
        self.axial_idx = value
        self.axial_label.setText(f"横断面位置: {value} / {self.shape[2] - 1}")
        self.update_all_slices()
    
    def on_sagittal_changed(self, value):
        self.sagittal_idx = value
        self.sagittal_label.setText(f"矢状面位置: {value} / {self.shape[0] - 1}")
        self.update_all_slices()
    
    def on_coronal_changed(self, value):
        self.coronal_idx = value
        self.coronal_label.setText(f"冠状面位置: {value} / {self.shape[1] - 1}")
        self.update_all_slices()
    
    def update_all_slices(self):
        self.update_axial_slice()
        self.update_sagittal_slice()
        self.update_coronal_slice()
    
    def update_axial_slice(self):
        self.axial_plotter.clear()
        
        slice_data = self.volume_data[:, :, self.axial_idx]
        grid = pv.ImageData()
        grid.dimensions = (slice_data.shape[0], slice_data.shape[1], 1)
        grid.spacing = (1, 1, 1)
        grid.origin = (0, 0, 0)
        grid.point_data["values"] = slice_data.flatten(order="F")
        
        self.axial_plotter.add_mesh(
            grid,
            cmap="gray",
            clim=[0, 100],
            show_scalar_bar=True,
            scalar_bar_args={"title": "灰度值", "color": "white", "label_color": "white"}
        )
        
        self.axial_plotter.add_text(
            f"横断面 - Slice {self.axial_idx}",
            position="upper_left",
            font_size=10,
            color="white"
        )
        
        self.axial_plotter.view_xy()
        self.axial_plotter.reset_camera()
    
    def update_sagittal_slice(self):
        self.sagittal_plotter.clear()
        
        slice_data = self.volume_data[self.sagittal_idx, :, :]
        grid = pv.ImageData()
        grid.dimensions = (slice_data.shape[0], slice_data.shape[1], 1)
        grid.spacing = (1, 1, 1)
        grid.origin = (0, 0, 0)
        grid.point_data["values"] = slice_data.flatten(order="F")
        
        self.sagittal_plotter.add_mesh(
            grid,
            cmap="gray",
            clim=[0, 100],
            show_scalar_bar=True,
            scalar_bar_args={"title": "灰度值", "color": "white", "label_color": "white"}
        )
        
        self.sagittal_plotter.add_text(
            f"矢状面 - Slice {self.sagittal_idx}",
            position="upper_left",
            font_size=10,
            color="white"
        )
        
        self.sagittal_plotter.view_zy()
        self.sagittal_plotter.reset_camera()
    
    def update_coronal_slice(self):
        self.coronal_plotter.clear()
        
        slice_data = self.volume_data[:, self.coronal_idx, :]
        grid = pv.ImageData()
        grid.dimensions = (slice_data.shape[0], slice_data.shape[1], 1)
        grid.spacing = (1, 1, 1)
        grid.origin = (0, 0, 0)
        grid.point_data["values"] = slice_data.flatten(order="F")
        
        self.coronal_plotter.add_mesh(
            grid,
            cmap="gray",
            clim=[0, 100],
            show_scalar_bar=True,
            scalar_bar_args={"title": "灰度值", "color": "white", "label_color": "white"}
        )
        
        self.coronal_plotter.add_text(
            f"冠状面 - Slice {self.coronal_idx}",
            position="upper_left",
            font_size=10,
            color="white"
        )
        
        self.coronal_plotter.view_xz()
        self.coronal_plotter.reset_camera()
    
    def update_intensity_display(self, plotter, view_type):
        try:
            if view_type == "axial":
                val = self.volume_data[:, :, self.axial_idx].mean()
                self.intensity_label.setText(
                    f"横断面平均灰度值: {val:.2f}\n"
                    f"当前切片: {self.axial_idx}\n"
                    f"灰度范围: {self.volume_data[:, :, self.axial_idx].min():.2f} - {self.volume_data[:, :, self.axial_idx].max():.2f}"
                )
            elif view_type == "sagittal":
                val = self.volume_data[self.sagittal_idx, :, :].mean()
                self.intensity_label.setText(
                    f"矢状面平均灰度值: {val:.2f}\n"
                    f"当前切片: {self.sagittal_idx}\n"
                    f"灰度范围: {self.volume_data[self.sagittal_idx, :, :].min():.2f} - {self.volume_data[self.sagittal_idx, :, :].max():.2f}"
                )
            elif view_type == "coronal":
                val = self.volume_data[:, self.coronal_idx, :].mean()
                self.intensity_label.setText(
                    f"冠状面平均灰度值: {val:.2f}\n"
                    f"当前切片: {self.coronal_idx}\n"
                    f"灰度范围: {self.volume_data[:, self.coronal_idx, :].min():.2f} - {self.volume_data[:, self.coronal_idx, :].max():.2f}"
                )
        except Exception as e:
            self.intensity_label.setText(f"无法获取灰度值: {str(e)}")


def main():
    app = QApplication(sys.argv)
    viewer = MedicalViewer()
    viewer.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
