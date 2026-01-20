// Globale Variablen
let scene, camera, renderer, controls;
let leftScene, leftCamera, leftRenderer, leftControls;
let rightScene, rightCamera, rightRenderer, rightControls;
let currentModel = null;
let leftModel = null;
let rightModel = null;
let isCompareMode = false;
let syncingCameras = false;

// Kamera-Startpositionen (weiter raus und von oben)
const DEFAULT_CAMERA_POSITION = { x: 10, y: 12, z: 10 };
const DEFAULT_CAMERA_TARGET = { x: 0, y: 0, z: 0 };

const years = ['1150', '1175', '1374', '1550', '1630', '1936'];
const models = {};

// Initialisierung
init();

function init() {
    setupSingleView();
    setupEventListeners();
    loadModel('1150');
}

// Einzelansicht Setup
function setupSingleView() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
    controls.maxDistance = 50;
    controls.minDistance = 2;
    
    // Beleuchtung
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    scene.add(hemisphereLight);
    
    animate();
}

// Vergleichsansicht Setup
function setupCompareView() {
    const leftView = document.getElementById('leftView');
    const rightView = document.getElementById('rightView');
    
    // Linke Szene
    leftScene = new THREE.Scene();
    leftScene.background = new THREE.Color(0x1a1a2e);
    
    leftCamera = new THREE.PerspectiveCamera(
        75,
        leftView.clientWidth / leftView.clientHeight,
        0.1,
        1000
    );
    leftCamera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
    
    leftRenderer = new THREE.WebGLRenderer({ antialias: true });
    leftRenderer.setSize(leftView.clientWidth, leftView.clientHeight);
    leftRenderer.shadowMap.enabled = true;
    leftView.appendChild(leftRenderer.domElement);
    
    leftControls = new THREE.OrbitControls(leftCamera, leftRenderer.domElement);
    leftControls.enableDamping = true;
    leftControls.dampingFactor = 0.05;
    leftControls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
    leftControls.maxDistance = 50;
    leftControls.minDistance = 2;
    
    // Rechte Szene
    rightScene = new THREE.Scene();
    rightScene.background = new THREE.Color(0x1a1a2e);
    
    rightCamera = new THREE.PerspectiveCamera(
        75,
        rightView.clientWidth / rightView.clientHeight,
        0.1,
        1000
    );
    rightCamera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
    
    rightRenderer = new THREE.WebGLRenderer({ antialias: true });
    rightRenderer.setSize(rightView.clientWidth, rightView.clientHeight);
    rightRenderer.shadowMap.enabled = true;
    rightView.appendChild(rightRenderer.domElement);
    
    rightControls = new THREE.OrbitControls(rightCamera, rightRenderer.domElement);
    rightControls.enableDamping = true;
    rightControls.dampingFactor = 0.05;
    rightControls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
    rightControls.maxDistance = 50;
    rightControls.minDistance = 2;
    
    // Beleuchtung für beide Szenen
    addLightsToScene(leftScene);
    addLightsToScene(rightScene);
    
    // Kamera-Synchronisation
    leftControls.addEventListener('change', () => {
        if (!syncingCameras) {
            syncingCameras = true;
            syncCameras(leftCamera, leftControls, rightCamera, rightControls);
            syncingCameras = false;
        }
    });
    
    rightControls.addEventListener('change', () => {
        if (!syncingCameras) {
            syncingCameras = true;
            syncCameras(rightCamera, rightControls, leftCamera, leftControls);
            syncingCameras = false;
        }
    });
    
    animateCompare();
}

function addLightsToScene(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    scene.add(hemisphereLight);
}

// Kamera-Synchronisation
function syncCameras(sourceCamera, sourceControls, targetCamera, targetControls) {
    targetCamera.position.copy(sourceCamera.position);
    targetCamera.quaternion.copy(sourceCamera.quaternion);
    targetCamera.zoom = sourceCamera.zoom;
    targetCamera.updateProjectionMatrix();
    
    targetControls.target.copy(sourceControls.target);
    targetControls.update();
}

// Modell laden
function loadModel(year, targetScene = null) {
    showLoading(true);
    
    if (models[year]) {
        displayModel(year, targetScene);
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    loader.load(
        `${year}.glb`,
        (gltf) => {
            models[year] = gltf.scene;
            displayModel(year, targetScene);
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% geladen');
        },
        (error) => {
            console.error('Fehler beim Laden:', error);
            showLoading(false);
            alert(`Fehler beim Laden des Modells ${year}.glb. Bitte überprüfe den Dateinamen.`);
        }
    );
}

function displayModel(year, targetScene = null) {
    const model = models[year].clone();
    
    // Modell zentrieren
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    
    if (targetScene === 'left') {
        if (leftModel) leftScene.remove(leftModel);
        leftModel = model;
        leftScene.add(leftModel);
    } else if (targetScene === 'right') {
        if (rightModel) rightScene.remove(rightModel);
        rightModel = model;
        rightScene.add(rightModel);
    } else {
        if (currentModel) scene.remove(currentModel);
        currentModel = model;
        scene.add(currentModel);
    }
    
    showLoading(false);
}

// Event Listeners
function setupEventListeners() {
    // Einzelansicht Jahr-Auswahl
    const yearButtons = document.querySelectorAll('#yearSelector .year-btn');
    yearButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            yearButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadModel(btn.dataset.year);
        });
    });
    
    // Vergleichen Button
    document.getElementById('compareBtn').addEventListener('click', enterCompareMode);
    
    // Zurück Button
    document.getElementById('backBtn').addEventListener('click', exitCompareMode);
    
    // Reset Button im Vergleichsmodus
    document.getElementById('resetBtn').addEventListener('click', resetCompareView);
    
    // Vergleichsmodus Jahr-Auswahl
    const compareButtons = document.querySelectorAll('.year-selector-compare .year-btn');
    compareButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const side = btn.dataset.side;
            const year = btn.dataset.year;
            
            // Aktiven Button aktualisieren
            document.querySelectorAll(`.year-selector-compare .year-btn[data-side="${side}"]`)
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Label aktualisieren
            document.getElementById(`${side}Label`).textContent = year;
            
            // Modell laden
            loadModel(year, side);
        });
    });
    
    // Slider
    setupSlider();
    
    // Fenster-Resize
    window.addEventListener('resize', onWindowResize);
}

function setupSlider() {
    const sliderContainer = document.getElementById('sliderContainer');
    const splitContainer = document.querySelector('.split-container');
    const leftView = document.getElementById('leftView');
    const rightView = document.getElementById('rightView');
    
    let isDragging = false;
    
    sliderContainer.addEventListener('mousedown', () => {
        isDragging = true;
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !isCompareMode) return;
        
        const rect = splitContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        
        if (percentage > 10 && percentage < 90) {
            leftView.style.flex = `0 0 ${percentage}%`;
            rightView.style.flex = `0 0 ${100 - percentage}%`;
            
            if (leftRenderer && rightRenderer) {
                const leftWidth = leftView.clientWidth;
                const rightWidth = rightView.clientWidth;
                
                leftRenderer.setSize(leftWidth, leftView.clientHeight);
                leftCamera.aspect = leftWidth / leftView.clientHeight;
                leftCamera.updateProjectionMatrix();
                
                rightRenderer.setSize(rightWidth, rightView.clientHeight);
                rightCamera.aspect = rightWidth / rightView.clientHeight;
                rightCamera.updateProjectionMatrix();
            }
        }
    });
}

// Vergleichsmodus
function enterCompareMode() {
    isCompareMode = true;
    document.getElementById('compareMode').classList.add('active');
    document.getElementById('yearSelector').style.display = 'none';
    document.getElementById('compareBtn').style.display = 'none';
    
    if (!leftRenderer) {
        setupCompareView();
    }
    
    // Standard-Modelle laden
    loadModel('1150', 'left');
    loadModel('1936', 'right');
}

function exitCompareMode() {
    isCompareMode = false;
    document.getElementById('compareMode').classList.remove('active');
    document.getElementById('yearSelector').style.display = 'block';
    document.getElementById('compareBtn').style.display = 'block';
}

// Ansicht zurücksetzen im Vergleichsmodus
function resetCompareView() {
    if (leftCamera && leftControls) {
        leftCamera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
        leftControls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
        leftControls.update();
    }
    
    if (rightCamera && rightControls) {
        rightCamera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
        rightControls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
        rightControls.update();
    }
}

// Animation
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function animateCompare() {
    requestAnimationFrame(animateCompare);
    
    if (isCompareMode) {
        if (leftControls) leftControls.update();
        if (rightControls) rightControls.update();
        
        if (leftRenderer && leftScene && leftCamera) {
            leftRenderer.render(leftScene, leftCamera);
        }
        if (rightRenderer && rightScene && rightCamera) {
            rightRenderer.render(rightScene, rightCamera);
        }
    }
}

// Hilfsfunktionen
function onWindowResize() {
    if (!isCompareMode) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    } else {
        const leftView = document.getElementById('leftView');
        const rightView = document.getElementById('rightView');
        
        if (leftRenderer && leftCamera) {
            leftCamera.aspect = leftView.clientWidth / leftView.clientHeight;
            leftCamera.updateProjectionMatrix();
            leftRenderer.setSize(leftView.clientWidth, leftView.clientHeight);
        }
        
        if (rightRenderer && rightCamera) {
            rightCamera.aspect = rightView.clientWidth / rightView.clientHeight;
            rightCamera.updateProjectionMatrix();
            rightRenderer.setSize(rightView.clientWidth, rightView.clientHeight);
        }
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}