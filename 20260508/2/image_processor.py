import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageDraw, ImageFont
import threading
import traceback
import sys


def enable_dpi_awareness():
    if sys.platform == 'win32':
        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass


class ImageBatchProcessor:
    def __init__(self, root):
        self.root = root
        self.root.title("图片批量处理工具")
        self.root.geometry("800x800")
        self.root.resizable(True, True)
        self.root.minsize(750, 700)
        
        self.input_folder = tk.StringVar()
        self.output_folder = tk.StringVar()
        self.quality = tk.IntVar(value=80)
        self.watermark_text = tk.StringVar(value="水印")
        self.watermark_position = tk.StringVar(value="右下角")
        self.watermark_opacity = tk.IntVar(value=50)
        self.is_processing = False
        
        self.create_widgets()
    
    def create_widgets(self):
        canvas = tk.Canvas(self.root)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True, padx=10, pady=10)
        scrollbar.pack(side="right", fill="y")
        
        main_frame = tk.Frame(scrollable_frame, padx=30, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        tk.Label(main_frame, text="图片批量处理工具", font=("Arial", 20, "bold")).pack(pady=(0, 25))
        
        tk.Label(main_frame, text="输入文件夹:", font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(10, 5))
        input_frame = tk.Frame(main_frame)
        input_frame.pack(fill=tk.X, pady=(0, 15))
        tk.Entry(input_frame, textvariable=self.input_folder, font=("Arial", 11)).pack(side=tk.LEFT, padx=(0, 10), fill=tk.X, expand=True)
        tk.Button(input_frame, text="选择文件夹", command=self.select_input_folder, width=12, font=("Arial", 11, "bold"), bg="#2196F3", fg="white", relief=tk.RAISED, bd=2).pack(side=tk.LEFT)
        
        tk.Label(main_frame, text="输出文件夹:", font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(10, 5))
        output_frame = tk.Frame(main_frame)
        output_frame.pack(fill=tk.X, pady=(0, 15))
        tk.Entry(output_frame, textvariable=self.output_folder, font=("Arial", 11)).pack(side=tk.LEFT, padx=(0, 10), fill=tk.X, expand=True)
        tk.Button(output_frame, text="选择文件夹", command=self.select_output_folder, width=12, font=("Arial", 11, "bold"), bg="#2196F3", fg="white", relief=tk.RAISED, bd=2).pack(side=tk.LEFT)
        
        tk.Label(main_frame, text="压缩质量 (30-90%):", font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(10, 5))
        quality_frame = tk.Frame(main_frame)
        quality_frame.pack(fill=tk.X, pady=(0, 15))
        tk.Scale(quality_frame, from_=30, to=90, orient=tk.HORIZONTAL, variable=self.quality, length=550, tickinterval=10, font=("Arial", 10)).pack(side=tk.LEFT, padx=(0, 10), fill=tk.X, expand=True)
        tk.Label(quality_frame, textvariable=self.quality, width=5, font=("Arial", 14, "bold")).pack(side=tk.LEFT)
        
        tk.Label(main_frame, text="水印设置", font=("Arial", 16, "bold")).pack(anchor=tk.W, pady=(25, 15))
        
        tk.Label(main_frame, text="水印文字:", font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(0, 5))
        tk.Entry(main_frame, textvariable=self.watermark_text, font=("Arial", 12), width=50).pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(main_frame, text="水印位置:", font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(0, 5))
        position_frame = tk.Frame(main_frame)
        position_frame.pack(fill=tk.X, pady=(0, 10))
        positions = ["左上角", "右上角", "左下角", "右下角", "中心"]
        tk.OptionMenu(position_frame, self.watermark_position, *positions).pack(side=tk.LEFT)
        
        tk.Label(main_frame, text="水印透明度 (0-100%):", font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(0, 5))
        opacity_frame = tk.Frame(main_frame)
        opacity_frame.pack(fill=tk.X, pady=(0, 15))
        tk.Scale(opacity_frame, from_=0, to=100, orient=tk.HORIZONTAL, variable=self.watermark_opacity, length=550, tickinterval=20, font=("Arial", 10)).pack(side=tk.LEFT, padx=(0, 10), fill=tk.X, expand=True)
        tk.Label(opacity_frame, textvariable=self.watermark_opacity, width=5, font=("Arial", 14, "bold")).pack(side=tk.LEFT)
        
        tk.Label(main_frame, text="处理进度:", font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(25, 5))
        self.progress_bar = ttk.Progressbar(main_frame, length=650, mode='determinate')
        self.progress_bar.pack(fill=tk.X, pady=(0, 10))
        
        self.status_label = tk.Label(main_frame, text="就绪", font=("Arial", 11), fg="gray")
        self.status_label.pack(anchor=tk.W, pady=(0, 20))
        
        button_frame = tk.Frame(main_frame)
        button_frame.pack(pady=(10, 20))
        self.process_button = tk.Button(button_frame, text="开始处理", command=self.start_processing, 
                                        font=("Arial", 14, "bold"), bg="#4CAF50", fg="white", 
                                        width=18, height=2, bd=2, relief=tk.RAISED, cursor="hand2")
        self.process_button.pack()
    
    def select_input_folder(self):
        folder = filedialog.askdirectory(title="选择输入文件夹")
        if folder:
            self.input_folder.set(folder)
    
    def select_output_folder(self):
        folder = filedialog.askdirectory(title="选择输出文件夹")
        if folder:
            self.output_folder.set(folder)
    
    def get_image_files(self, folder):
        image_extensions = ('.jpg', '.jpeg', '.png')
        return [f for f in os.listdir(folder) 
                if f.lower().endswith(image_extensions) and os.path.isfile(os.path.join(folder, f))]
    
    def calculate_watermark_position(self, image_size, watermark_size, position):
        img_width, img_height = image_size
        wm_width, wm_height = watermark_size
        margin = 20
        
        positions = {
            "左上角": (margin, margin),
            "右上角": (img_width - wm_width - margin, margin),
            "左下角": (margin, img_height - wm_height - margin),
            "右下角": (img_width - wm_width - margin, img_height - wm_height - margin),
            "中心": ((img_width - wm_width) // 2, (img_height - wm_height) // 2)
        }
        
        return positions.get(position, positions["右下角"])
    
    def add_watermark(self, image, text, position, opacity):
        if not text:
            return image
        
        width, height = image.size
        
        try:
            font_size = max(20, min(width, height) // 15)
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        alpha = int(opacity * 2.55)
        watermark_image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(watermark_image)
        
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x, y = self.calculate_watermark_position((width, height), (text_width, text_height), position)
        
        draw.text((x, y), text, font=font, fill=(255, 255, 255, alpha))
        
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        combined = Image.alpha_composite(image, watermark_image)
        return combined
    
    def process_single_image(self, input_path, output_path):
        with Image.open(input_path) as img:
            original_mode = img.mode
            quality = self.quality.get()
            text = self.watermark_text.get()
            position = self.watermark_position.get()
            opacity = self.watermark_opacity.get()
            
            if text:
                img = self.add_watermark(img, text, position, opacity)
            
            if output_path.lower().endswith('.png'):
                img.save(output_path, 'PNG', optimize=True)
            else:
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                img.save(output_path, 'JPEG', quality=quality, optimize=True)
    
    def process_images(self):
        try:
            input_dir = self.input_folder.get()
            output_dir = self.output_folder.get()
            
            if not input_dir or not output_dir:
                self.update_status("错误: 请选择输入和输出文件夹")
                messagebox.showerror("错误", "请选择输入和输出文件夹")
                self.reset_button()
                self.is_processing = False
                return
            
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            image_files = self.get_image_files(input_dir)
            
            if not image_files:
                self.update_status("错误: 输入文件夹中没有找到图片")
                messagebox.showwarning("警告", "输入文件夹中没有找到jpg或png图片")
                self.reset_button()
                self.is_processing = False
                return
            
            total = len(image_files)
            self.progress_bar['maximum'] = total
            self.progress_bar['value'] = 0
            
            processed = 0
            for filename in image_files:
                if not self.is_processing:
                    break
                
                input_path = os.path.join(input_dir, filename)
                output_path = os.path.join(output_dir, filename)
                
                self.update_status(f"正在处理: {filename} ({processed + 1}/{total})")
                
                try:
                    self.process_single_image(input_path, output_path)
                    processed += 1
                    self.progress_bar['value'] = processed
                except Exception as e:
                    print(f"处理 {filename} 时出错: {e}")
                    traceback.print_exc()
            
            if self.is_processing:
                self.update_status(f"完成! 处理了 {processed}/{total} 张图片")
                messagebox.showinfo("完成", f"成功处理了 {processed} 张图片")
            else:
                self.update_status("已取消")
            
            self.reset_button()
            self.is_processing = False
            
        except Exception as e:
            self.update_status(f"处理过程中出错: {str(e)}")
            messagebox.showerror("错误", f"处理过程中出错: {str(e)}")
            traceback.print_exc()
            self.reset_button()
            self.is_processing = False
    
    def start_processing(self):
        if self.is_processing:
            self.is_processing = False
            self.process_button.config(text="正在取消...", state=tk.DISABLED)
        else:
            self.is_processing = True
            self.process_button.config(text="取消处理", bg="#f44336")
            
            thread = threading.Thread(target=self.process_images)
            thread.daemon = True
            thread.start()
    
    def update_status(self, text):
        self.status_label.config(text=text)
    
    def reset_button(self):
        self.process_button.config(state=tk.NORMAL, text="开始处理", bg="#4CAF50", fg="white")


def main():
    enable_dpi_awareness()
    root = tk.Tk()
    app = ImageBatchProcessor(root)
    root.mainloop()


if __name__ == "__main__":
    main()
