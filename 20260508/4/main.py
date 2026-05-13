import sys
import numpy as np
import pyvista as pv
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QSlider, QLabel, QGroupBox, QPushButton, QCheckBox, QSpacerItem,
    QSizePolicy
)
from PyQt5.QtCore import Qt
from pyvistaqt import QtInteractor


def generate_seismic_data(shape=(64, 64, 64)):
    z, y, x = np.mgrid[0:1:1j*shape[0], 0:1:1j*shape[1], 0:1:1j*shape[2]]
    
    data = np.zeros(shape)
    
    layers = [
        (0.2, 0.25, 30, 50, 1),
        (0.4, 0.42, 40, 60, 0.8),
        (0.6, 0.63, 20, 40, 1.2),
        (0.8, 0.82, 35, 55, 0.9),
    ]
    
    for z_start, z_end, freq, phase, amplitude in layers:
        mask = (z >= z_start) & (z <= z_end)
        data[mask] += amplitude * np.sin(freq * x[mask] + phase * np.pi) * np.cos(20 * y[mask])
    
    anomalies = [
        (0.3, 0.5, 0.5, 0.1, 0.1, 0.1, 2.0),
        (0.55, 0.3, 0.7, 0.08, 0.08, 0.08, -1.5),
        (0.7, 0.6, 0.4, 0.12, 0.1, 0.12, 1.8),
    ]
    
    for z_c, y_c, x_c, z_r, y_r, x_r, amp in anomalies:
        distance = np.sqrt(((z - z_c) / z_r)**2 + 
                          ((y - y_c) / y_r)**2 + 
                          ((x - x_c) / x_r)**2)
        data[distance < 1] += amp * np.exp(-distance[distance < 1]**2 * 5)
    
    data += np.random.normal(0, 0.1, shape) * 0.2
    
    data = (data - data.min()) / (data.max() - data.min())
    
    return data


class SeismicViewer(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("三维地震数据体渲染器")
        self.setGeometry(100, 100, 1400, 900)
        
        self.data_shape = (64, 64, 64)
        self.data = generate_seismic_data(self.data_shape)
        self.grid = pv.UniformGrid()
        self.grid.dimensions = self.data_shape
        self.grid.spacing = [1.0, 1.0, 1.0]
        self.grid.origin = [0.0, 0.0, 0.0]
        self.grid["seismic"] = self.data.flatten(order="F")
        
        self.slice_x = self.data_shape[0] // 2
        self.slice_y = self.data_shape[1] // 2
        self.slice_z = self.data_shape[2] // 2
        
        self.opacity_value = 0.8
        self.opacity_function = [0.0, 0.3, 0.5, 0.7, 1.0]
        self.opacity_mapping = [0.0, 0.1, 0.4, 0.8, 1.0]
        
        self.show_volume = True
        self.show_slice_x = False
        self.show_slice_y = False
        self.show_slice_z = False
        
        self.volume_actor = None
        self.slice_actors = {"x": None, "y": None, "z": None}
        
        self.init_ui()
        
    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QHBoxLayout(central_widget)
        
        self.plotter = QtInteractor(self)
        main_layout.addWidget(self.plotter, stretch=4)
        
        control_panel = QWidget()
        control_layout = QVBoxLayout(control_panel)
        control_panel.setFixedWidth(320)
        main_layout.addWidget(control_panel)
        
        self.create_slice_controls(control_layout)
        self.create_opacity_controls(control_layout)
        self.create_display_controls(control_layout)
        
        control_layout.addItem(QSpacerItem(20, 40, QSizePolicy.Minimum, QSizePolicy.Expanding))
        
        self.setup_scene()
        
    def create_slice_controls(self, parent_layout):
        group = QGroupBox("切片控制")
        layout = QVBoxLayout(group)
        
        self.slider_x, self.label_x = self.create_slider("X轴", 0, self.data_shape[0]-1, self.slice_x, self.update_slice_x)
        layout.addWidget(self.label_x)
        layout.addWidget(self.slider_x)
        
        self.slider_y, self.label_y = self.create_slider("Y轴", 0, self.data_shape[1]-1, self.slice_y, self.update_slice_y)
        layout.addWidget(self.label_y)
        layout.addWidget(self.slider_y)
        
        self.slider_z, self.label_z = self.create_slider("Z轴", 0, self.data_shape[2]-1, self.slice_z, self.update_slice_z)
        layout.addWidget(self.label_z)
        layout.addWidget(self.slider_z)
        
        parent_layout.addWidget(group)
        
    def create_opacity_controls(self, parent_layout):
        group = QGroupBox("透明度设置")
        layout = QVBoxLayout(group)
        
        self.opacity_slider, self.opacity_label = self.create_slider(
            "整体透明度", 0, 100, int(self.opacity_value * 100), 
            self.update_opacity, is_float=True
        )
        layout.addWidget(self.opacity_label)
        layout.addWidget(self.opacity_slider)
        
        opacity_mapping_group = QGroupBox("不透明度映射点")
        mapping_layout = QVBoxLayout(opacity_mapping_group)
        
        self.mapping_sliders = []
        self.mapping_labels = []
        
        for i in range(5):
            init_val = int(self.opacity_mapping[i] * 100)
            slider, label = self.create_slider(
                f"点{i+1} (值={self.opacity_function[i]:.1f})", 
                0, 100, init_val,
                lambda val, idx=i: self.update_opacity_mapping(idx, val),
                is_float=True
            )
            self.mapping_sliders.append(slider)
            self.mapping_labels.append(label)
            mapping_layout.addWidget(label)
            mapping_layout.addWidget(slider)
        
        layout.addWidget(opacity_mapping_group)
        parent_layout.addWidget(group)
        
    def create_display_controls(self, parent_layout):
        group = QGroupBox("显示选项")
        layout = QVBoxLayout(group)
        
        self.chk_volume = QCheckBox("显示体渲染")
        self.chk_volume.setChecked(self.show_volume)
        self.chk_volume.stateChanged.connect(self.toggle_volume)
        layout.addWidget(self.chk_volume)
        
        self.chk_slice_x = QCheckBox("显示X轴切片")
        self.chk_slice_x.setChecked(self.show_slice_x)
        self.chk_slice_x.stateChanged.connect(lambda: self.toggle_slice("x"))
        layout.addWidget(self.chk_slice_x)
        
        self.chk_slice_y = QCheckBox("显示Y轴切片")
        self.chk_slice_y.setChecked(self.show_slice_y)
        self.chk_slice_y.stateChanged.connect(lambda: self.toggle_slice("y"))
        layout.addWidget(self.chk_slice_y)
        
        self.chk_slice_z = QCheckBox("显示Z轴切片")
        self.chk_slice_z.setChecked(self.show_slice_z)
        self.chk_slice_z.stateChanged.connect(lambda: self.toggle_slice("z"))
        layout.addWidget(self.chk_slice_z)
        
        reset_btn = QPushButton("重置视图")
        reset_btn.clicked.connect(self.reset_view)
        layout.addWidget(reset_btn)
        
        parent_layout.addWidget(group)
        
    def create_slider(self, name, min_val, max_val, init_val, callback, is_float=False):
        label = QLabel(f"{name}: {init_val/100.0 if is_float else init_val}")
        slider = QSlider(Qt.Horizontal)
        slider.setMinimum(min_val)
        slider.setMaximum(max_val)
        slider.setValue(init_val)
        slider.valueChanged.connect(lambda val: self._slider_changed(label, name, val, callback, is_float))
        return slider, label
        
    def _slider_changed(self, label, name, value, callback, is_float):
        display_val = value / 100.0 if is_float else value
        label.setText(f"{name.split('(')[0].strip()}: {display_val:.2f}" if is_float else f"{name}: {display_val}")
        if "(" in name:
            label.setText(f"{name.split('(')[0].strip()}({name.split('(')[1]}: {display_val:.2f})")
        callback(value)
        
    def setup_scene(self):
        self.plotter.add_axes()
        self.plotter.show_grid()
        self.plotter.set_background("white")
        
        self.update_volume()
        self.plotter.reset_camera()
        
    def get_opacity_transfer_function(self):
        values = np.linspace(self.grid["seismic"].min(), self.grid["seismic"].max(), 100)
        opacity = np.zeros_like(values)
        
        for i, (x_val, op_val) in enumerate(zip(self.opacity_function, self.opacity_mapping)):
            if i == 0:
                continue
            prev_x = self.opacity_function[i-1]
            prev_op = self.opacity_mapping[i-1]
            
            x_min = self.grid["seismic"].min() + prev_x * (self.grid["seismic"].max() - self.grid["seismic"].min())
            x_max = self.grid["seismic"].min() + x_val * (self.grid["seismic"].max() - self.grid["seismic"].min())
            
            mask = (values >= x_min) & (values <= x_max)
            t = (values[mask] - x_min) / (x_max - x_min) if x_max > x_min else 0
            opacity[mask] = prev_op + t * (op_val - prev_op)
        
        return opacity * self.opacity_value
        
    def update_volume(self):
        if self.volume_actor is not None:
            self.plotter.remove_actor(self.volume_actor)
            self.volume_actor = None
            
        if self.show_volume:
            opacity = self.get_opacity_transfer_function()
            self.volume_actor = self.plotter.add_volume(
                self.grid,
                scalars="seismic",
                cmap="viridis",
                opacity=opacity,
                show_scalar_bar=True,
                scalar_bar_args={"title": "地震振幅", "vertical": True}
            )
            
    def update_slice(self, axis, position):
        if self.slice_actors[axis] is not None:
            self.plotter.remove_actor(self.slice_actors[axis])
            self.slice_actors[axis] = None
            
        show_attr = getattr(self, f"show_slice_{axis}")
        if not show_attr:
            return
            
        origin = self.grid.origin
        spacing = self.grid.spacing
        
        if axis == "x":
            slice_origin = [origin[0] + position * spacing[0], origin[1], origin[2]]
            normal = [1, 0, 0]
        elif axis == "y":
            slice_origin = [origin[0], origin[1] + position * spacing[1], origin[2]]
            normal = [0, 1, 0]
        else:
            slice_origin = [origin[0], origin[1], origin[2] + position * spacing[2]]
            normal = [0, 0, 1]
            
        sliced = self.grid.slice(normal=normal, origin=slice_origin)
        self.slice_actors[axis] = self.plotter.add_mesh(
            sliced,
            scalars="seismic",
            cmap="viridis",
            show_scalar_bar=False
        )
        
    def update_slice_x(self, value):
        self.slice_x = value
        self.update_slice("x", value)
        
    def update_slice_y(self, value):
        self.slice_y = value
        self.update_slice("y", value)
        
    def update_slice_z(self, value):
        self.slice_z = value
        self.update_slice("z", value)
        
    def update_opacity(self, value):
        self.opacity_value = value / 100.0
        self.update_volume()
        
    def update_opacity_mapping(self, index, value):
        self.opacity_mapping[index] = value / 100.0
        self.update_volume()
        
    def toggle_volume(self, state):
        self.show_volume = state == Qt.Checked
        self.update_volume()
        
    def toggle_slice(self, axis):
        checkbox = getattr(self, f"chk_slice_{axis}")
        setattr(self, f"show_slice_{axis}", checkbox.isChecked())
        position = getattr(self, f"slice_{axis}")
        self.update_slice(axis, position)
        
    def reset_view(self):
        self.plotter.reset_camera()
        self.slice_x = self.data_shape[0] // 2
        self.slice_y = self.data_shape[1] // 2
        self.slice_z = self.data_shape[2] // 2
        
        self.slider_x.setValue(self.slice_x)
        self.slider_y.setValue(self.slice_y)
        self.slider_z.setValue(self.slice_z)
        
        self.opacity_value = 0.8
        self.opacity_slider.setValue(int(self.opacity_value * 100))
        
        self.opacity_mapping = [0.0, 0.1, 0.4, 0.8, 1.0]
        for i, slider in enumerate(self.mapping_sliders):
            slider.setValue(int(self.opacity_mapping[i] * 100))


def main():
    app = QApplication(sys.argv)
    viewer = SeismicViewer()
    viewer.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
