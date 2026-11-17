
/* Rekursive Kugel  */

var sphere = (function () {

  var SEED_VERTICES = [
    [ 1,  0,  0], [-1,  0,  0],
    [ 0,  1,  0], [  0, -1,  0],
    [ 0,  0,  1], [  0,  0, -1]
  ];

  // Die Eckpunkte jedes Dreiecks sind gegen den Uhrzeigersinn geordnet, sodass die Fl#che nach aussen zeigt (=Backface-Culling)
  var SEED_TRIANGLES = [
    [0, 2, 4], [0, 3, 5], [1, 2, 5], [1, 3, 4],
    [0, 5, 2], [0, 4, 3], [1, 4, 2], [1, 5, 3]
  ];

  // Farbverlauf über den Winkel des Punktes um die Y-Achse
  var PALETTE = [
    [0.98, 0.76, 0.36],
    [0.87, 0.36, 0.41],
    [0.36, 0.44, 0.84],
    [0.29, 0.74, 0.66]
  ];

  function normalize(point, radius) {
    var x = point[0], y = point[1], z = point[2];
    var length = Math.sqrt(x * x + y * y + z * z) || 1;
    var scale = radius / length;
    return [x * scale, y * scale, z * scale];
  }

  function mixColor(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  // Mittelpunkt einer Kante, geteilte Kanten werden nur einmal angelegt
  function edgeMidpoint(geometry, edges, a, b, radius) {
    var key = a < b ? a + ':' + b : b + ':' + a;
    if (edges[key] !== undefined) return edges[key];

    var pa = geometry.vertices[a];
    var pb = geometry.vertices[b];
    var index = geometry.vertices.length;
    geometry.vertices.push(normalize([
      (pa[0] + pb[0]) / 2,
      (pa[1] + pb[1]) / 2,
      (pa[2] + pb[2]) / 2
    ], radius));

    edges[key] = index;
    return index;
  }

  function subdivide(geometry, edges, triangles, a, b, c, depth, radius) {
    if (depth === 0) {
      triangles.push(a, b, c);
      return;
    }
    var ab = edgeMidpoint(geometry, edges, a, b, radius);
    var bc = edgeMidpoint(geometry, edges, b, c, radius);
    var ca = edgeMidpoint(geometry, edges, c, a, radius);

    subdivide(geometry, edges, triangles, a, ab, ca, depth - 1, radius);
    subdivide(geometry, edges, triangles, b, bc, ab, depth - 1, radius);
    subdivide(geometry, edges, triangles, c, ca, bc, depth - 1, radius);
    subdivide(geometry, edges, triangles, ab, bc, ca, depth - 1, radius);
  }

  function vertexColor(point, radius) {
    var angle = Math.atan2(point[2], point[0]);
    var t = (angle + Math.PI) / (2 * Math.PI) * PALETTE.length;
    var i = Math.floor(t) % PALETTE.length;
    var next = (i + 1) % PALETTE.length;
    var color = mixColor(PALETTE[i], PALETTE[next], t - Math.floor(t));

    // Am Äquator etwas heller, an den Polen etwas dunkler
    var light = 0.86 + 0.14 * (1 - Math.abs(point[1]) / radius);
    return [color[0] * light, color[1] * light, color[2] * light];
  }

  function createVertexData(radius, depth) {
    var geometry = { vertices : [] };
    var edges = {};
    var triangles = [];

    for (var s = 0; s < SEED_VERTICES.length; s++) {
      geometry.vertices.push(normalize(SEED_VERTICES[s], radius));
    }
    for (var t = 0; t < SEED_TRIANGLES.length; t++) {
      var seed = SEED_TRIANGLES[t];
      subdivide(geometry, edges, triangles, seed[0], seed[1], seed[2], depth, radius);
    }

    var vertexCount = geometry.vertices.length;
    this.vertices = new Float32Array(3 * vertexCount);
    this.normals = new Float32Array(3 * vertexCount);
    this.colors = new Float32Array(3 * vertexCount);
    this.indicesTris = new Uint16Array(triangles.length);

    var lineEdges = {};
    var lines = [];

    for (var v = 0; v < vertexCount; v++) {
      var p = geometry.vertices[v];
      this.vertices[v * 3] = p[0];
      this.vertices[v * 3 + 1] = p[1];
      this.vertices[v * 3 + 2] = p[2];

      // Bei der Kugel zeigen die Normalen in Richtung der normierten Ortsvektoren
      this.normals[v * 3] = p[0] / radius;
      this.normals[v * 3 + 1] = p[1] / radius;
      this.normals[v * 3 + 2] = p[2] / radius;

      var color = vertexColor(p, radius);
      this.colors[v * 3] = color[0];
      this.colors[v * 3 + 1] = color[1];
      this.colors[v * 3 + 2] = color[2];
    }

    for (var i = 0; i < triangles.length; i++) {
      this.indicesTris[i] = triangles[i];
    }

    // Jede Kante der Dreiecke genau einmal als Linie
    for (var f = 0; f < triangles.length; f += 3) {
      var a = triangles[f], b = triangles[f + 1], c = triangles[f + 2];
      addLineEdge(lines, lineEdges, a, b);
      addLineEdge(lines, lineEdges, b, c);
      addLineEdge(lines, lineEdges, c, a);
    }
    this.indicesLines = new Uint16Array(lines.length);
    for (var l = 0; l < lines.length; l++) {
      this.indicesLines[l] = lines[l];
    }
  }

  function addLineEdge(lines, lineEdges, a, b) {
    var key = a < b ? a + ':' + b : b + ':' + a;
    if (lineEdges[key]) return;
    lineEdges[key] = true;
    lines.push(a, b);
  }

  return {
    createVertexData : createVertexData
  };

}());
