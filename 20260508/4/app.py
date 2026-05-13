import streamlit as st
import numpy as np
import pyvista as pv
import matplotlib.pyplot as plt


st.set_page_config(
    page_title="三维地震数据体渲染器",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded"
)


def generate_seismic_data(shape=(64, 64, 64)):
    nx, ny, nz = shape
    x = np.linspace(0, 1, nx)
    y = np.linspace(0, 1, ny)
    z = np.linspace(0, 1, nz)
    X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
    
    data = np.zeros(shape)
    
    layers = [
        (0.2, 0.25, 30, 50, 1.0),
        (0.4, 0.42, 40, 60, 0.8),
        (0.6, 0.63, 20, 40, 1.2),
        (0.8, 0.82, 35, 55, 0.9),
    ]
    
    for z_start, z_end, freq, phase, amplitude in layers:
        mask = (Z >= z_start) & (Z <= z_end)
        data[mask] += amplitude * np.sin(freq * X[mask] + phase * np.pi) * np.cos(20 * Y[mask])
    
    anomalies = [
        (0.3, 0.5, 0.5, 0.1, 0.1, 0.1, 2.0),
        (0.55, 0.3, 0.7, 0.08, 0.08, 0.08, -1.5),
        (0.7, 0.6, 0.4, 0.12, 0.1, 0.12, 1.8),
    ]
    
    for z_c, y_c, x_c, z_r, y_r, x_r, amp in anomalies:
        distance = np.sqrt(((Z - z_c) / z_r)**2 + 
                          ((Y - y_c) / y_r)**2 + 
                          ((X - x_c) / x_r)**2)
        data[distance < 1] += amp * np.exp(-distance[distance < 1]**2 * 5)
    
    data += np.random.normal(0, 0.1, shape) * 0.2
    
    data = (data - data.min()) / (data.max() - data.min())
    
    return data


def get_opacity_transfer_function(data_min, data_max, opacity_mapping, opacity_value):
    opacity_function = [0.0, 0.25, 0.5, 0.75, 1.0]
    values = np.linspace(data_min, data_max, 256)
    opacity = np.zeros_like(values)
    
    for i in range(1, len(opacity_function)):
        x_val = opacity_function[i]
        op_val = opacity_mapping[i]
        prev_x = opacity_function[i-1]
        prev_op = opacity_mapping[i-1]
        
        x_min = data_min + prev_x * (data_max - data_min)
        x_max = data_min + x_val * (data_max - data_min)
        
        mask = (values >= x_min) & (values <= x_max)
        if x_max > x_min:
            t = (values[mask] - x_min) / (x_max - x_min)
            opacity[mask] = prev_op + t * (op_val - prev_op)
    
    final_opacity = opacity * opacity_value
    return final_opacity.tolist()


def plot_slice(slice_data, axis, position, cmap="viridis"):
    fig, ax = plt.subplots(figsize=(8, 6))
    
    if axis == "x":
        im = ax.imshow(slice_data.T, cmap=cmap, origin="lower", aspect="equal")
        ax.set_xlabel("Y轴")
        ax.set_ylabel("Z轴")
    elif axis == "y":
        im = ax.imshow(slice_data.T, cmap=cmap, origin="lower", aspect="equal")
        ax.set_xlabel("X轴")
        ax.set_ylabel("Z轴")
    else:
        im = ax.imshow(slice_data, cmap=cmap, origin="lower", aspect="equal")
        ax.set_xlabel("X轴")
        ax.set_ylabel("Y轴")
    
    ax.set_title(f"{axis.upper()}轴切片 (位置: {position})")
    plt.colorbar(im, ax=ax, label="地震振幅")
    plt.tight_layout()
    return fig


def main():
    st.title("🌍 三维地震数据体渲染器")
    st.markdown("---")
    
    if "data" not in st.session_state:
        with st.spinner("正在生成模拟地震数据..."):
            data_shape = (64, 64, 64)
            st.session_state.data = generate_seismic_data(data_shape)
            st.session_state.data_shape = data_shape
    
    data = st.session_state.data
    shape = st.session_state.data_shape
    nx, ny, nz = shape
    
    with st.sidebar:
        st.header("⚙️ 控制面板")
        
        st.subheader("📐 切片控制")
        slice_x_idx = st.slider("X轴切片位置", 0, nx-1, nx//2, key="slice_x")
        slice_y_idx = st.slider("Y轴切片位置", 0, ny-1, ny//2, key="slice_y")
        slice_z_idx = st.slider("Z轴切片位置", 0, nz-1, nz//2, key="slice_z")
        
        st.subheader("🎨 透明度设置")
        opacity_value = st.slider("整体透明度", 0.0, 1.0, 0.7, 0.05)
        
        st.markdown("**不透明度映射点**")
        col1, col2, col3, col4, col5 = st.columns(5)
        with col1:
            op1 = st.slider("点1\n(0.0)", 0.0, 1.0, 0.0, 0.05, key="op1")
        with col2:
            op2 = st.slider("点2\n(0.25)", 0.0, 1.0, 0.15, 0.05, key="op2")
        with col3:
            op3 = st.slider("点3\n(0.5)", 0.0, 1.0, 0.45, 0.05, key="op3")
        with col4:
            op4 = st.slider("点4\n(0.75)", 0.0, 1.0, 0.75, 0.05, key="op4")
        with col5:
            op5 = st.slider("点5\n(1.0)", 0.0, 1.0, 1.0, 0.05, key="op5")
        
        opacity_mapping = [op1, op2, op3, op4, op5]
        
        st.subheader("👁️ 显示选项")
        show_volume = st.checkbox("显示体渲染", value=True, key="show_volume")
        show_slice_x = st.checkbox("显示X轴切片", value=True, key="show_slice_x")
        show_slice_y = st.checkbox("显示Y轴切片", value=True, key="show_slice_y")
        show_slice_z = st.checkbox("显示Z轴切片", value=True, key="show_slice_z")
        
        st.markdown("---")
        if st.button("🔄 重置视图", use_container_width=True):
            st.rerun()
    
    tab1, tab2 = st.tabs(["📊 2D 切片视图", "🎯 3D 体渲染"])
    
    with tab1:
        st.header("二维切片视图")
        st.markdown("使用侧边栏的滑块调整切片位置")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if show_slice_x:
                st.subheader("X轴切片")
                slice_data_x = data[slice_x_idx, :, :]
                fig_x = plot_slice(slice_data_x, "x", slice_x_idx)
                st.pyplot(fig_x)
                plt.close(fig_x)
            else:
                st.info("X轴切片已隐藏")
        
        with col2:
            if show_slice_y:
                st.subheader("Y轴切片")
                slice_data_y = data[:, slice_y_idx, :]
                fig_y = plot_slice(slice_data_y, "y", slice_y_idx)
                st.pyplot(fig_y)
                plt.close(fig_y)
            else:
                st.info("Y轴切片已隐藏")
        
        with col3:
            if show_slice_z:
                st.subheader("Z轴切片")
                slice_data_z = data[:, :, slice_z_idx]
                fig_z = plot_slice(slice_data_z, "z", slice_z_idx)
                st.pyplot(fig_z)
                plt.close(fig_z)
            else:
                st.info("Z轴切片已隐藏")
    
    with tab2:
        st.header("三维体渲染")
        
        if show_volume:
            with st.spinner("正在渲染3D体数据..."):
                grid = pv.ImageData()
                grid.dimensions = [nx, ny, nz]
                grid.spacing = [1.0, 1.0, 1.0]
                grid.origin = [0.0, 0.0, 0.0]
                
                flat_data = data.flatten(order='F')
                grid["seismic"] = flat_data
                
                opacity = get_opacity_transfer_function(
                    grid["seismic"].min(),
                    grid["seismic"].max(),
                    opacity_mapping,
                    opacity_value
                )
                
                pl = pv.Plotter(off_screen=True, window_size=[1000, 700])
                pl.background_color = "white"
                
                if show_volume:
                    vol = pl.add_volume(
                        grid,
                        scalars="seismic",
                        cmap="viridis",
                        opacity=opacity,
                        show_scalar_bar=True,
                        scalar_bar_args={
                            "title": "地震振幅",
                            "vertical": True,
                            "position_x": 0.85,
                            "position_y": 0.05,
                            "height": 0.9,
                            "width": 0.08
                        }
                    )
                
                if show_slice_x:
                    center_x = slice_x_idx * 1.0
                    slice_mesh_x = grid.slice(normal="x", origin=[center_x, ny/2, nz/2])
                    if slice_mesh_x.n_points > 0:
                        pl.add_mesh(
                            slice_mesh_x,
                            scalars="seismic",
                            cmap="viridis",
                            opacity=1.0,
                            show_scalar_bar=False
                        )
                
                if show_slice_y:
                    center_y = slice_y_idx * 1.0
                    slice_mesh_y = grid.slice(normal="y", origin=[nx/2, center_y, nz/2])
                    if slice_mesh_y.n_points > 0:
                        pl.add_mesh(
                            slice_mesh_y,
                            scalars="seismic",
                            cmap="viridis",
                            opacity=1.0,
                            show_scalar_bar=False
                        )
                
                if show_slice_z:
                    center_z = slice_z_idx * 1.0
                    slice_mesh_z = grid.slice(normal="z", origin=[nx/2, ny/2, center_z])
                    if slice_mesh_z.n_points > 0:
                        pl.add_mesh(
                            slice_mesh_z,
                            scalars="seismic",
                            cmap="viridis",
                            opacity=1.0,
                            show_scalar_bar=False
                        )
                
                pl.add_axes()
                pl.show_grid()
                pl.reset_camera()
                
                screenshot = pl.screenshot(return_img=True)
                pl.close()
                
                st.image(screenshot, caption="三维地震数据体渲染", use_container_width=True)
        else:
            st.info("体渲染已隐藏，请在侧边栏勾选\"显示体渲染\"")
        
        st.markdown("---")
        
        st.subheader("📈 不透明度传递函数")
        fig_opacity, ax_opacity = plt.subplots(figsize=(10, 4))
        x_vals = [0.0, 0.25, 0.5, 0.75, 1.0]
        ax_opacity.plot(x_vals, opacity_mapping, "bo-", linewidth=2, markersize=8)
        ax_opacity.fill_between(x_vals, opacity_mapping, alpha=0.3)
        ax_opacity.set_xlabel("数据值 (归一化)")
        ax_opacity.set_ylabel("不透明度")
        ax_opacity.set_title(f"不透明度传递函数 (整体透明度: {opacity_value:.2f})")
        ax_opacity.grid(True, alpha=0.3)
        ax_opacity.set_ylim([0, 1.05])
        st.pyplot(fig_opacity)
        plt.close(fig_opacity)
    
    with st.expander("ℹ️ 使用说明"):
        st.markdown("""
        ### 功能说明
        
        **1. 切片控制**
        - 使用侧边栏的三个滑块分别调整 X、Y、Z 轴的切片位置
        - 可以在\"2D 切片视图\"标签页查看三个方向的独立切片
        - 也可以在\"3D 体渲染\"标签页中看到切片与体数据的叠加
        
        **2. 透明度设置**
        - **整体透明度**：控制整个体数据的可见程度
        - **不透明度映射点**：5 个控制点定义数据值到不透明度的映射关系
          - 点1 (0.0): 最小值对应的不透明度
          - 点2 (0.25): 25%位置的值对应的不透明度
          - 点3 (0.5): 中间值对应的不透明度
          - 点4 (0.75): 75%位置的值对应的不透明度
          - 点5 (1.0): 最大值对应的不透明度
        
        **3. 显示选项**
        - 可以独立控制体渲染和三个切片的显示/隐藏
        - 点击\"重置视图\"按钮恢复默认设置
        
        **4. 数据说明**
        - 数据为 64×64×64 的模拟地震数据体
        - 包含多层水平地层和球形异常体
        - 数据值已归一化到 [0, 1] 范围
        
        **坐标系统**
        - X轴: 0 ~ 63 (切片索引)
        - Y轴: 0 ~ 63 (切片索引)
        - Z轴: 0 ~ 63 (切片索引)
        - 网格间距: 1.0 单位
        """)
    
    st.markdown("---")
    st.caption("三维地震数据体渲染器 | Powered by Streamlit + PyVista")


if __name__ == "__main__":
    main()
