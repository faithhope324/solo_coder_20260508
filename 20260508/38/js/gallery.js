const imageData = [
    {
        url: 'https://picsum.photos/seed/photo1/800/600',
        title: '城市夜景',
        description: '繁华都市的夜晚，灯火璀璨，车水马龙，展现现代都市的无限魅力。'
    },
    {
        url: 'https://picsum.photos/seed/photo2/800/600',
        title: '山川湖海',
        description: '大自然的壮丽景色，山峰耸立，湖水清澈，让人心旷神怡。'
    },
    {
        url: 'https://picsum.photos/seed/photo3/800/600',
        title: '日落黄昏',
        description: '夕阳西下，天边染上了金色的光芒，美不胜收。'
    },
    {
        url: 'https://picsum.photos/seed/photo4/800/600',
        title: '森林秘境',
        description: '茂密的森林中，阳光透过树叶洒下斑驳的光影。'
    },
    {
        url: 'https://picsum.photos/seed/photo5/800/600',
        title: '海边风光',
        description: '蔚蓝的大海，金色的沙滩，感受海风的轻拂。'
    },
    {
        url: 'https://picsum.photos/seed/photo6/800/600',
        title: '雪山之巅',
        description: '白雪皑皑的山峰，在阳光下闪耀着银色的光芒。'
    },
    {
        url: 'https://picsum.photos/seed/photo7/800/600',
        title: '古镇风情',
        description: '古朴的小镇，青石板路，承载着历史的记忆。'
    },
    {
        url: 'https://picsum.photos/seed/photo8/800/600',
        title: '星空银河',
        description: '浩瀚的夜空，繁星点点，银河横跨天际。'
    },
    {
        url: 'https://picsum.photos/seed/photo9/800/600',
        title: '花海绽放',
        description: '五彩缤纷的花朵竞相开放，香气四溢。'
    },
    {
        url: 'https://picsum.photos/seed/photo10/800/600',
        title: '瀑布奇观',
        description: '飞流直下的瀑布，水雾弥漫，气势磅礴。'
    },
    {
        url: 'https://picsum.photos/seed/photo11/800/600',
        title: '沙漠驼铃',
        description: '金黄的沙漠，驼队缓缓前行，留下串串脚印。'
    },
    {
        url: 'https://picsum.photos/seed/photo12/800/600',
        title: '极光幻彩',
        description: '北极圈上空绚丽的极光，如同大自然的画布。'
    }
];

class Gallery {
    constructor(scene) {
        this.scene = scene;
        this.images = [];
        this.radius = 12;
        this.imageWidth = 3;
        this.imageHeight = 2.25;
        this.loadedCount = 0;
        this.totalImages = imageData.length;
        this.onLoadComplete = null;
    }

    loadTextures() {
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';

        return new Promise((resolve) => {
            imageData.forEach((data, index) => {
                loader.load(
                    data.url,
                    (texture) => {
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        this.createImagePlane(texture, index, data);
                        this.loadedCount++;
                        if (this.loadedCount === this.totalImages) {
                            resolve();
                        }
                    },
                    undefined,
                    (error) => {
                        console.error('纹理加载失败:', error);
                        this.createFallbackImage(index, data);
                        this.loadedCount++;
                        if (this.loadedCount === this.totalImages) {
                            resolve();
                        }
                    }
                );
            });
        });
    }

    createFallbackImage(index, data) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 512, 384);
        gradient.addColorStop(0, `hsl(${index * 30}, 70%, 50%)`);
        gradient.addColorStop(1, `hsl(${(index * 30) + 60}, 70%, 30%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 384);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.title, 256, 200);
        
        const texture = new THREE.CanvasTexture(canvas);
        this.createImagePlane(texture, index, data);
    }

    createImagePlane(texture, index, data) {
        const geometry = new THREE.PlaneGeometry(this.imageWidth, this.imageHeight);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.5
        });

        const plane = new THREE.Mesh(geometry, material);
        
        const angle = (index / this.totalImages) * Math.PI * 2;
        plane.position.x = Math.cos(angle) * this.radius;
        plane.position.z = Math.sin(angle) * this.radius;
        plane.lookAt(0, 0, 0);
        
        plane.userData = {
            index,
            data,
            originalPosition: plane.position.clone(),
            originalRotation: plane.rotation.clone(),
            originalScale: plane.scale.clone(),
            isHovered: false,
            isSelected: false
        };

        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0xe94560, 
            transparent: true, 
            opacity: 0 
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        plane.add(edges);
        plane.userData.edges = edges;

        this.images.push(plane);
        this.scene.add(plane);
    }

    getImageByIndex(index) {
        return this.images.find(img => img.userData.index === index);
    }

    getImageData(index) {
        return imageData[index];
    }

    getTotalImages() {
        return this.totalImages;
    }

    updateHoverEffect(targetImage) {
        this.images.forEach(img => {
            const edges = img.userData.edges;
            if (img === targetImage) {
                img.userData.isHovered = true;
                edges.material.opacity = Math.min(edges.material.opacity + 0.1, 1);
                img.scale.lerp(new THREE.Vector3(1.05, 1.05, 1.05), 0.1);
            } else if (!img.userData.isSelected) {
                img.userData.isHovered = false;
                edges.material.opacity = Math.max(edges.material.opacity - 0.1, 0);
                img.scale.lerp(img.userData.originalScale, 0.1);
            }
        });
    }

    resetAllImages() {
        this.images.forEach(img => {
            img.userData.isSelected = false;
            img.userData.isHovered = false;
            const edges = img.userData.edges;
            edges.material.opacity = 0;
        });
    }

    animateImageToCenter(image, onComplete) {
        const targetPosition = new THREE.Vector3(0, 0, 5);
        const targetRotation = new THREE.Euler(0, 0, 0);
        const targetScale = new THREE.Vector3(2, 2, 2);

        image.userData.isSelected = true;

        const animate = () => {
            image.position.lerp(targetPosition, 0.08);
            image.rotation.x = THREE.MathUtils.lerp(image.rotation.x, targetRotation.x, 0.08);
            image.rotation.y = THREE.MathUtils.lerp(image.rotation.y, targetRotation.y, 0.08);
            image.rotation.z = THREE.MathUtils.lerp(image.rotation.z, targetRotation.z, 0.08);
            image.scale.lerp(targetScale, 0.08);

            const posDist = image.position.distanceTo(targetPosition);
            const scaleDist = image.scale.distanceTo(targetScale);

            if (posDist > 0.1 || scaleDist > 0.1) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };
        animate();
    }

    animateImageBack(image, onComplete) {
        const originalPosition = image.userData.originalPosition;
        const originalRotation = image.userData.originalRotation;
        const originalScale = image.userData.originalScale;

        image.userData.isSelected = false;

        const animate = () => {
            image.position.lerp(originalPosition, 0.08);
            image.rotation.x = THREE.MathUtils.lerp(image.rotation.x, originalRotation.x, 0.08);
            image.rotation.y = THREE.MathUtils.lerp(image.rotation.y, originalRotation.y, 0.08);
            image.rotation.z = THREE.MathUtils.lerp(image.rotation.z, originalRotation.z, 0.08);
            image.scale.lerp(originalScale, 0.08);

            const posDist = image.position.distanceTo(originalPosition);
            const scaleDist = image.scale.distanceTo(originalScale);

            if (posDist > 0.1 || scaleDist > 0.1) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };
        animate();
    }
}

export { Gallery, imageData };
