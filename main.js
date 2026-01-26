// Globale Variablen
let scene, camera, renderer, controls;
let leftScene, leftCamera, leftRenderer, leftControls;
let rightScene, rightCamera, rightRenderer, rightControls;
let currentModel = null;
let leftModel = null;
let rightModel = null;
let isCompareMode = false;
let syncingCameras = false;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Kamera-Startpositionen (weiter weg und flacher)
const DEFAULT_CAMERA_POSITION = { x: 0, y: 600, z: 1800 };
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
    scene.background = new THREE.Color(0xf5f5f5);
    
    camera = new THREE.PerspectiveCamera(
        isMobile ? 70 : 80,
        window.innerWidth / window.innerHeight,
        0.1,
        isMobile ? 5000 : 10000
    );
    camera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile,
        powerPreference: isMobile ? "low-power" : "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isMobile;
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
    controls.maxDistance = 2000;
    controls.minDistance = 100;
    
    // Beleuchtung - auf Mobile reduziert
    const ambientLight = new THREE.AmbientLight(0xffffff, isMobile ? 0.8 : 0.6);
    scene.add(ambientLight);
    
    if (!isMobile) {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        scene.add(hemisphereLight);
    }
    
    animate();
}

// Vergleichsansicht Setup
function setupCompareView() {
    const leftView = document.getElementById('leftView');
    const rightView = document.getElementById('rightView');
    
    // Linke Szene
    leftScene = new THREE.Scene();
    leftScene.background = new THREE.Color(0xf5f5f5);
    
    leftCamera = new THREE.PerspectiveCamera(
        80,
        leftView.clientWidth / leftView.clientHeight,
        0.1,
        10000
    );
    leftCamera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
    
    leftRenderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile,
        powerPreference: isMobile ? "low-power" : "high-performance"
    });
    leftRenderer.setSize(leftView.clientWidth, leftView.clientHeight);
    leftRenderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    leftRenderer.shadowMap.enabled = !isMobile;
    leftView.appendChild(leftRenderer.domElement);
    
    leftControls = new THREE.OrbitControls(leftCamera, leftRenderer.domElement);
    leftControls.enableDamping = true;
    leftControls.dampingFactor = 0.05;
    leftControls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
    leftControls.maxDistance = 2000;
    leftControls.minDistance = 100;
    
    // Rechte Szene
    rightScene = new THREE.Scene();
    rightScene.background = new THREE.Color(0xf5f5f5);
    
    rightCamera = new THREE.PerspectiveCamera(
        80,
        rightView.clientWidth / rightView.clientHeight,
        0.1,
        10000
    );
    rightCamera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
    
    rightRenderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile,
        powerPreference: isMobile ? "low-power" : "high-performance"
    });
    rightRenderer.setSize(rightView.clientWidth, rightView.clientHeight);
    rightRenderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    rightRenderer.shadowMap.enabled = !isMobile;
    rightView.appendChild(rightRenderer.domElement);
    
    rightControls = new THREE.OrbitControls(rightCamera, rightRenderer.domElement);
    rightControls.enableDamping = true;
    rightControls.dampingFactor = 0.05;
    rightControls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
    rightControls.maxDistance = 2000;
    rightControls.minDistance = 100;
    
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
    // Auf Mobile: Vergleichsmodus nicht erlauben
    if (isMobile && targetScene) {
        showLoading(false);
        return;
    }
    
    showLoading(true);
    
    // Auf Mobile: Altes Modell sofort entfernen um RAM freizugeben
    if (isMobile && models[year]) {
        // Lösche alle anderen gecachten Modelle
        for (let key in models) {
            if (key !== year) {
                if (models[key]) {
                    models[key].traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                    delete models[key];
                }
            }
        }
    }
    
    if (models[year] && !isMobile) {
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
    
    // Mobile Optimierung: Reduziere Komplexität
    if (isMobile) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Deaktiviere Schatten auf Mobile
                child.castShadow = false;
                child.receiveShadow = false;
                
                // Vereinfache Material für bessere Performance
                if (child.material) {
                    child.material.needsUpdate = false;
                }
            }
        });
    }
    
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
    document.getElementById('compareBtn').addEventListener('click', () => {
        if (isMobile) {
            alert('Der Vergleichsmodus ist auf Mobilgeräten leider nicht verfügbar. Bitte nutze einen Desktop-Browser für diese Funktion.');
            return;
        }
        enterCompareMode();
    });
    
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
    // Slider-Funktion entfernt - feste 50/50 Aufteilung
    
    // Fenster-Resize
    window.addEventListener('resize', onWindowResize);
}

// Animation
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