import glfw
from OpenGL.GL import *
import numpy as np
import sys
import os

class OBJParser:
    def __init__(self):
        self.vertices = []
        self.faces = []

    def parse(self, filepath):
        self.vertices = []
        self.faces = []

        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                parts = line.split()
                if not parts:
                    continue

                type_token = parts[0]

                if type_token == 'v':
                    if len(parts) >= 4:
                        x = float(parts[1])
                        y = float(parts[2])
                        z = float(parts[3])
                        self.vertices.append([x, y, z])

                elif type_token == 'f':
                    face_indices = []
                    for part in parts[1:]:
                        indices = part.split('/')
                        if indices[0]:
                            idx = int(indices[0]) - 1
                            face_indices.append(idx)
                    if len(face_indices) >= 3:
                        self.faces.append(face_indices)

        return self.vertices, self.faces

class Camera:
    def __init__(self):
        self.position = [0.0, 0.0, 5.0]
        self.rotation = [0.0, 0.0]
        self.zoom = 1.0
        self.last_mouse = [0.0, 0.0]
        self.is_left_dragging = False
        self.is_right_dragging = False
        self.wireframe = False

class OBJViewer:
    def __init__(self, width=800, height=600, title="OBJ Model Viewer"):
        self.width = width
        self.height = height
        self.title = title
        self.window = None
        self.camera = Camera()
        self.parser = OBJParser()
        self.vertices = []
        self.faces = []
        self.flat_vertices = None
        self.vertex_buffer = None

    def load_model(self, filepath):
        print(f"Loading model: {filepath}")
        self.vertices, self.faces = self.parser.parse(filepath)
        print(f"Loaded {len(self.vertices)} vertices, {len(self.faces)} faces")
        self._prepare_buffers()

    def _prepare_buffers(self):
        vertex_data = []
        for face in self.faces:
            for idx in face:
                vertex_data.extend(self.vertices[idx])

        self.flat_vertices = np.array(vertex_data, dtype=np.float32)

        if self.vertex_buffer is None:
            self.vertex_buffer = glGenBuffers(1)

        glBindBuffer(GL_ARRAY_BUFFER, self.vertex_buffer)
        glBufferData(GL_ARRAY_BUFFER, self.flat_vertices, GL_STATIC_DRAW)
        glBindBuffer(GL_ARRAY_BUFFER, 0)

    def initialize_glfw(self):
        if not glfw.init():
            print("Failed to initialize GLFW")
            sys.exit(1)

        glfw.window_hint(glfw.CONTEXT_VERSION_MAJOR, 2)
        glfw.window_hint(glfw.CONTEXT_VERSION_MINOR, 1)

        self.window = glfw.create_window(self.width, self.height, self.title, None, None)
        if not self.window:
            print("Failed to create GLFW window")
            glfw.terminate()
            sys.exit(1)

        glfw.make_context_current(self.window)
        glfw.set_framebuffer_size_callback(self.window, self._framebuffer_size_callback)
        glfw.set_mouse_button_callback(self.window, self._mouse_button_callback)
        glfw.set_cursor_pos_callback(self.window, self._cursor_pos_callback)
        glfw.set_scroll_callback(self.window, self._scroll_callback)
        glfw.set_key_callback(self.window, self._key_callback)

        glEnable(GL_DEPTH_TEST)
        glEnable(GL_LIGHTING)
        glEnable(GL_LIGHT0)
        glEnable(GL_COLOR_MATERIAL)
        glColorMaterial(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE)

        light_pos = [1.0, 1.0, 1.0, 0.0]
        glLightfv(GL_LIGHT0, GL_POSITION, light_pos)

        glClearColor(0.1, 0.1, 0.15, 1.0)

    def _framebuffer_size_callback(self, window, width, height):
        self.width = width
        self.height = height
        glViewport(0, 0, width, height)

    def _mouse_button_callback(self, window, button, action, mods):
        if button == glfw.MOUSE_BUTTON_LEFT:
            self.camera.is_left_dragging = (action == glfw.PRESS)
        elif button == glfw.MOUSE_BUTTON_RIGHT:
            self.camera.is_right_dragging = (action == glfw.PRESS)

        if action == glfw.PRESS:
            xpos, ypos = glfw.get_cursor_pos(window)
            self.camera.last_mouse = [xpos, ypos]

    def _cursor_pos_callback(self, window, xpos, ypos):
        dx = xpos - self.camera.last_mouse[0]
        dy = ypos - self.camera.last_mouse[1]

        if self.camera.is_left_dragging:
            self.camera.rotation[0] += dy * 0.5
            self.camera.rotation[1] += dx * 0.5

        if self.camera.is_right_dragging:
            self.camera.position[0] -= dx * 0.01
            self.camera.position[1] += dy * 0.01

        self.camera.last_mouse = [xpos, ypos]

    def _scroll_callback(self, window, xoffset, yoffset):
        self.camera.zoom *= 1.0 + yoffset * 0.1
        if self.camera.zoom < 0.1:
            self.camera.zoom = 0.1

    def _key_callback(self, window, key, scancode, action, mods):
        if action == glfw.PRESS:
            if key == glfw.KEY_W:
                self.camera.wireframe = not self.camera.wireframe
                print(f"Wireframe mode: {'ON' if self.camera.wireframe else 'OFF'}")
            elif key == glfw.KEY_ESCAPE:
                glfw.set_window_should_close(window, True)

    def _setup_projection(self):
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()

        aspect = self.width / float(self.height) if self.height > 0 else 1.0
        near = 0.1
        far = 100.0
        fov = 45.0

        f = 1.0 / np.tan(np.radians(fov) / 2.0)

        m = [
            f / aspect, 0.0, 0.0, 0.0,
            0.0, f, 0.0, 0.0,
            0.0, 0.0, (far + near) / (near - far), -1.0,
            0.0, 0.0, (2.0 * far * near) / (near - far), 0.0
        ]
        glLoadMatrixf(m)

    def _setup_modelview(self):
        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()

        glTranslatef(self.camera.position[0], self.camera.position[1], -self.camera.position[2] * self.camera.zoom)
        glRotatef(self.camera.rotation[0], 1.0, 0.0, 0.0)
        glRotatef(self.camera.rotation[1], 0.0, 1.0, 0.0)

    def _draw_model(self):
        if self.flat_vertices is None or len(self.faces) == 0:
            return

        if self.camera.wireframe:
            self._draw_wireframe()
        else:
            self._draw_with_normals()

    def _draw_wireframe(self):
        glColor3f(0.0, 1.0, 1.0)
        glDisable(GL_LIGHTING)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)

        for face in self.faces:
            glBegin(GL_LINE_LOOP)
            for idx in face:
                glVertex3fv(self.vertices[idx])
            glEnd()

        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        glEnable(GL_LIGHTING)

    def _draw_with_normals(self):
        glColor3f(0.3, 0.6, 0.9)

        for face in self.faces:
            if len(face) >= 3:
                v0 = np.array(self.vertices[face[0]])
                v1 = np.array(self.vertices[face[1]])
                v2 = np.array(self.vertices[face[2]])

                edge1 = v1 - v0
                edge2 = v2 - v0
                normal = np.cross(edge1, edge2)
                norm = np.linalg.norm(normal)
                if norm > 0:
                    normal = normal / norm

                glBegin(GL_POLYGON)
                glNormal3fv(normal)
                for idx in face:
                    glVertex3fv(self.vertices[idx])
                glEnd()

    def render(self):
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        self._setup_projection()
        self._setup_modelview()

        self._draw_model()

        glfw.swap_buffers(self.window)

    def run(self):
        if not self.window:
            self.initialize_glfw()

        print("Controls:")
        print("  - Left click + drag: Rotate")
        print("  - Right click + drag: Translate (pan)")
        print("  - Scroll wheel: Zoom")
        print("  - W key: Toggle wireframe mode")
        print("  - Escape: Exit")

        while not glfw.window_should_close(self.window):
            glfw.poll_events()
            self.render()

        glfw.terminate()

def create_cube_obj():
    cube_obj_content = """# Cube OBJ file
v -0.5 -0.5 -0.5
v  0.5 -0.5 -0.5
v  0.5  0.5 -0.5
v -0.5  0.5 -0.5
v -0.5 -0.5  0.5
v  0.5 -0.5  0.5
v  0.5  0.5  0.5
v -0.5  0.5  0.5

f 1 2 3 4
f 5 6 7 8
f 1 5 8 4
f 2 6 7 3
f 1 2 6 5
f 4 3 7 8
"""
    filepath = os.path.join(os.path.dirname(__file__), "cube.obj")
    with open(filepath, "w") as f:
        f.write(cube_obj_content)
    return filepath

def main():
    cube_path = create_cube_obj()

    viewer = OBJViewer()
    viewer.load_model(cube_path)
    viewer.initialize_glfw()
    viewer.run()

if __name__ == "__main__":
    main()
