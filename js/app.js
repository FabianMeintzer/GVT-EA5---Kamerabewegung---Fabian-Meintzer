
/* Anwendung der Szene mit kreisender LookAt-Kamera */


var app = (function () {

  var SPHERE_RADIUS = 1;
  var MIN_DEPTH = 0;
  var MAX_DEPTH = 6;

  var canvas, gl, prog;
  var models = [];
  var sphereModel, torusModel;
  var styleModels = [];

  var camera = {
    // Position der Kamera, eye[1] ist die Kamerahöhe
    eye : [0, 1.4, 4],
    // Punkt, auf den die Kamera gerichtet ist
    center : [0, 1, 0],
    up : [0, 1, 0],
    aspect : 1,
    zAngle : Math.PI / 6,
    // Radius der Kreisbahn in der XZ-Ebene
    distance : 4,
    // Öffnungswinkel der Kamera in Radiant
    fovy : 60 * Math.PI / 180,
    near : 0.5,
    far : 40,
    vMatrix : mat4.create(),
    pMatrix : mat4.create()
  };

  var settings = { depth : 2, fillstyle : 'fillwireframe' };

  var START_ANGLE = camera.zAngle;
  var START_DISTANCE = camera.distance;
  var START_HEIGHT = camera.eye[1];

  var LIMITS = {
    distanceMin : 1.8, distanceMax : 10,
    heightMin : -0.8, heightMax : 5,
    deltaRotate : Math.PI / 36,
    deltaHeight : 0.2,
    deltaDistance : 0.4
  };

  function start() {
    try {
      init();
      render();
    } catch (error) {
      showFatal('Die Anwendung konnte nicht gestartet werden: ' + error.message);
      console.error(error);
    }
  }

  function init() {
    initWebGL();
    initShaderProgram();
    initUniforms();
    initModels();
    initPipeline();
    initEventHandler();
    updateControls();
  }

  function initWebGL() {
    canvas = document.getElementById('canvas');

    gl = canvas.getContext('experimental-webgl') || canvas.getContext('webgl');

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  }

  function initShaderProgram() {
    var vs = initShader(gl.VERTEX_SHADER, 'vertexshader');
    var fs = initShader(gl.FRAGMENT_SHADER, 'fragmentshader');

    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPosition');
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Shader-Programm: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
  }

  function initShader(shaderType, sourceTagId) {
    var shader = gl.createShader(shaderType);
    var source = document.getElementById(sourceTagId).text;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(sourceTagId + ': ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function initUniforms() {
    prog.pMatrixUniform = gl.getUniformLocation(prog, 'uPMatrix');
    prog.mvMatrixUniform = gl.getUniformLocation(prog, 'uMVMatrix');
  }

  function initModels() {
    createModel('plane', 'wireframe');
    torusModel = createModel('torus', settings.fillstyle);
    sphereModel = createModel('sphere', settings.fillstyle, [SPHERE_RADIUS, settings.depth]);

    styleModels = [torusModel, sphereModel];
  }

  function createModel(geometryname, fillstyle, args) {
    var model = {
      geometryname : geometryname,
      fillstyle : fillstyle,
      args : args || []
    };
    initDataAndBuffers(model);
    models.push(model);
    return model;
  }

  function initDataAndBuffers(model) {
    window[model.geometryname]['createVertexData'].apply(model, model.args);

    model.vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
    prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(prog.positionAttrib);

    model.vboNormal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
    gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
    prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');

    model.vboColor = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboColor);
    gl.bufferData(gl.ARRAY_BUFFER, model.colors, gl.STATIC_DRAW);
    prog.colorAttrib = gl.getAttribLocation(prog, 'aColor');
    gl.enableVertexAttribArray(prog.colorAttrib);

    model.iboLines = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines, gl.STATIC_DRAW);
    model.iboLines.numberOfElements = model.indicesLines.length;

    model.iboTris = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris, gl.STATIC_DRAW);
    model.iboTris.numberOfElements = model.indicesTris.length;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  function deleteBuffers(model) {
    gl.deleteBuffer(model.vboPos);
    gl.deleteBuffer(model.vboNormal);
    gl.deleteBuffer(model.vboColor);
    gl.deleteBuffer(model.iboLines);
    gl.deleteBuffer(model.iboTris);
  }

  function initPipeline() {
    gl.clearColor(0.95, 0.95, 0.95, 1);

    // Backface-Culling(nur nach aussen gerichtete Dreiecke werden gezeichnet)
    gl.frontFace(gl.CCW);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Gefüllte Flächen rücken etwas zurück, damit Linien darauf sichtbar bleiben
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.5, 0);

    resizeCanvas();
  }

  function initEventHandler() {
    // Tastatur: Pfeiltasten drehen und Höhe, N und Shift+N Abstand, Taste R Reset
    window.onkeydown = function (evt) {
      var key = evt.key;
      var sign = evt.shiftKey ? -1 : 1;
      var handled = true;

      switch (key) {
        case 'ArrowLeft':
          drehen(-1);
          break;
        case 'ArrowRight':
          drehen(1);
          break;
        case 'ArrowUp':
          hoehe(1);
          break;
        case 'ArrowDown':
          hoehe(-1);
          break;
        case 'n':
        case 'N':
          zoom(sign);
          break;
        case 'r':
        case 'R':
          resetView();
          break;
        default:
          handled = false;
      }

      if (handled) {
        evt.preventDefault();
      }
    };

    var resize = function () {
      resizeCanvas();
      render();
    };
    window.addEventListener('resize', resize);
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(resize).observe(canvas);
    }
  }

  //  Bedienung der Webseite (Buttons und Tastatur)

  // Kamera auf der Kreisbahn drehen
  function drehen(dir) {
    camera.zAngle += dir * LIMITS.deltaRotate;
    render();
  }

  // Kamerahöhe verändern, unabhängig vom Abstand
  function hoehe(dir) {
    camera.eye[1] = clamp(camera.eye[1] + dir * LIMITS.deltaHeight,
      LIMITS.heightMin, LIMITS.heightMax);
    render();
  }

  // Kameraabstand vergrössern oder verkleinern
  function zoom(dir) {
    camera.distance = clamp(camera.distance + dir * LIMITS.deltaDistance,
      LIMITS.distanceMin, LIMITS.distanceMax);
    render();
  }

  // Kamera auf die Ausgangsposition zurücksetzen
  function resetView() {
    camera.zAngle = START_ANGLE;
    camera.distance = START_DISTANCE;
    camera.eye[1] = START_HEIGHT;
    render();
  }

  // Darstellungsart auswählen (Button)
  function selectMode(fillstyle) {
    settings.fillstyle = fillstyle;
    for (var i = 0; i < styleModels.length; i++) {
      styleModels[i].fillstyle = fillstyle;
    }
    updateControls();
    render();
  }

  // Rekursionstiefe der Kugel verändern (Button)
  function selectDepth(delta) {
    settings.depth = clamp(settings.depth + delta, MIN_DEPTH, MAX_DEPTH);

    deleteBuffers(sphereModel);
    sphereModel.args = [SPHERE_RADIUS, settings.depth];
    initDataAndBuffers(sphereModel);

    updateControls();
    render();
  }

  // Position der Kamera auf der Kreisbahn um die Y-Achse
  function calculateCameraOrbit() {
    var x = 0, z = 2;
    camera.eye[x] = camera.center[x] + camera.distance * Math.sin(camera.zAngle);
    camera.eye[z] = camera.center[z] + camera.distance * Math.cos(camera.zAngle);
  }

  function setProjection() {
    mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, camera.near, camera.far);
    gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
  }

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setProjection();
    calculateCameraOrbit();
    mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

    for (var i = 0; i < models.length; i++) {
      gl.uniformMatrix4fv(prog.mvMatrixUniform, false, camera.vMatrix);
      draw(models[i]);
    }

    infosAktualisieren();
  }

  function draw(model) {
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
    gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboColor);
    gl.vertexAttribPointer(prog.colorAttrib, 3, gl.FLOAT, false, 0, 0);

    var fill = (model.fillstyle.search(/fill/) !== -1);
    if (fill) {
      gl.enableVertexAttribArray(prog.normalAttrib);
      gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
      gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
      gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
    }

    var wireframe = (model.fillstyle.search(/wireframe/) !== -1);
    if (wireframe) {
      gl.disableVertexAttribArray(prog.normalAttrib);
      gl.vertexAttrib3f(prog.normalAttrib, 0, 1, 0);

      gl.lineWidth(fill ? 1.0 : 2.0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
      gl.drawElements(gl.LINES, model.iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
    }
  }

  function resizeCanvas() {
    var scale = Math.min(2, window.devicePixelRatio || 1);
    var width = Math.max(1, Math.round(canvas.clientWidth * scale));
    var height = Math.max(1, Math.round(canvas.clientHeight * scale));

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    camera.aspect = gl.viewportWidth / gl.viewportHeight;

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  }

  function updateControls() {
    document.getElementById('btnTiefeMinus').disabled = (settings.depth <= MIN_DEPTH);
    document.getElementById('btnTiefePlus').disabled = (settings.depth >= MAX_DEPTH);

    knopfSetzen('btnWire', settings.fillstyle == 'wireframe');
    knopfSetzen('btnFill', settings.fillstyle == 'fill');
    knopfSetzen('btnBoth', settings.fillstyle == 'fillwireframe');
  }

  // Gewählten Button hell einfärben
  function knopfSetzen(id, an) {
    var knopf = document.getElementById(id);
    if (!knopf) return;
    knopf.style.background = an ? '#2b6cb0' : '#4a5568';
    knopf.style.color = an ? '#ffffff' : '#dbe4ee';
  }

  // Infotext
  function infosAktualisieren() {
    var grad = '&deg;';
    var winkel = ((camera.zAngle * 180 / Math.PI) % 360 + 360) % 360;
    var dreiecke = sphereModel.indicesTris.length / 3;
    var ecken = sphereModel.vertices.length / 3;
    var kanten = sphereModel.indicesLines.length / 2;

    var html = '<h3>Kamera auf Kreisbahn, Blick mit lookAt</h3>';

    html += '<p class="formel">X = r &middot; sin(&alpha;)<br>'
          + 'Z = r &middot; cos(&alpha;)<br>Y = Kamerahöhe'
          + '<br><span class="klein">mit r = Kameraabstand, &alpha; = Winkel zur Z-Achse</span></p>';

    html += '<br><b>Darstellung:</b> ' + modusText() + ', die Gitterebene bleibt Linienmodell</p>';

    html += '<p><b>Kamera:</b> Winkel ' + winkel.toFixed(0) + grad + ', Höhe '
          + camera.eye[1].toFixed(2) + ', r = ' + camera.distance.toFixed(2) + '<br>'
          + '<b>Kugel:</b> Tiefe ' + settings.depth + ', ' + dreiecke + ' Dreiecke, '
          + ecken + ' Ecken, ' + kanten + ' Kanten</p>';

    html += '<p>Die Kamera steht auf einem Kreis um die Y-Achse und bleibt mit lookAt '
          + 'stets auf den Mittelpunkt der Kugel gerichtet, Winkel, Höhe und '
          + 'Abstand sind unabhängig voneinander einstellbar. Die Kugel entsteht '
          + 'rekursiv aus einem Oktaeder, jede Stufe teilt jedes Dreieck in vier: '
          + 'A(n) = 8 &middot; 4<sup>n</sup>.</p>';

    document.getElementById('info').innerHTML = html;
  }

  function modusText() {
    if (settings.fillstyle == 'fill') return 'gefüllte Fläche';
    if (settings.fillstyle == 'wireframe') return 'Linien';
    return 'Füllung mit Linien';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }


  return {
    start : start,
    drehen : drehen,
    hoehe : hoehe,
    zoom : zoom,
    resetView : resetView,
    selectMode : selectMode,
    selectDepth : selectDepth
  };

}());
