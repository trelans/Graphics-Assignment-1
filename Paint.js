

var gl;
var vertices;
var points;
var program;

var fill = 1;
var tessellation = 0;
var rotate = 0;
var twist = false;

/* triangle */
var vec_triangle = [
  vec2(-0.85, -0.4907477295),
  vec2( 0.85, -0.4907477295),
  vec2( 0.0,  0.9814954573)
];

var vec_triangle2 = [
  vec2(-0.5 * 1.75, -0,288675135 * 1.75),
  vec2( 0.5 * 1.75, -0.288675135 * 1.75),
  vec2( 0.0,  0.577350269 * 1.75)
];

/* square */
var vec_square = [
  vec2(-0.7, -0.7),
  vec2( 0.7,  0.7),
  vec2(-0.7,  0.7),

  vec2(-0.7, -0.7),
  vec2( 0.7,  0.7),
  vec2( 0.7, -0.7)
];

var vec_pentagon = [
  vec2(0.0, 0.0),
vec2(0.0, -1.000000),
vec2(-0.951057, -0.309017),

vec2(0.0, 0.0),
vec2(-0.951057, -0.309017),
vec2(-0.587785, 0.809017),

vec2(0.0, 0.0),
vec2(-0.587785, 0.809017),
vec2(0.587785, 0.809017),

vec2(0.0, 0.0),
vec2(0.587785, 0.809017),
vec2(0.951057, -0.309017),

vec2(0.0, 0.0),
vec2(0.951057, -0.309017),
vec2(0.0, -1.000000),
];


var vec_hexagon = [
vec2(0.0, 0.0),
vec2(0.0, -1.000000),
vec2(-0.866025, -0.500000),

vec2(0.0, 0.0),
vec2(-0.866025, -0.500000),
vec2(-0.866025, 0.500000),

vec2(0.0, 0.0),
vec2(-0.866025, 0.500000),
vec2(0.0, 1.000000),

vec2(0.0, 0.0),
vec2(0.0, 1.000000),
vec2(0.866025, 0.500000),

vec2(0.0, 0.0),
vec2(0.866025, 0.500000),
vec2(0.866025, -0.500000),

vec2(0.0, 0.0),
vec2(0.866025, -0.500000),
vec2(0.0, -1.000000),
  
];

vertices = vec_triangle.slice(0);

$(function() {
  var canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  } else {
    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    //  Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    
    recalculate();
  }

  
  $("#shape").selectmenu({change: function( event, ui ) {
    
    switch (ui.item.value) {
      default:
      case "3":
        vertices = vec_triangle.slice(0);
        break;
      case "4":
        vertices = vec_square.slice(0);
        break;
      case "5":
        vertices = vec_pentagon.slice(0);
        break;
      case "6":
        vertices = vec_hexagon.slice(0);
        break;
    } 
    recalculate();
    
  }});
  
  $("#tessellation-slider").slider({
    value:  0,
    min:    0,
    max:    5,
    step:   1,
    slide:  function(event, ui) {
      $("#tessellation").val("" + ui.value + "");
      tessellation = ui.value;
      recalculate();
  }});

  $("#fill").buttonset();
  $("#fill-radio1" , "#fill").click(function() {
    fill = 1;
    recalculate();
  });
  $("#fill-radio2" , "#fill").click(function() {
    fill = 2;
    recalculate();
  });
  $("#fill-radio3" , "#fill").click(function() {
    fill = 3;
    recalculate();
  });
  $("#fill-radio4" , "#fill").click(function() {
    fill = 4;
    recalculate();
  });
  
  $("#rotation-slider").slider({
    value:  0,
    min:    0,
    max:    1800,
    step:   1,
    slide:  function(event, ui) {
      $("#rotation").val("" + ui.value + "°");
      rotate = ui.value;
      recalculate();
  }});
});

  $("#twist").buttonset();
  $("#twist-radio1" , "#twist").click(function() {
    twist = false;
    recalculate();
  });
  $("#twist-radio2", "#twist").click(function() {
    twist = true;
    recalculate();
  });


function recalculate() {
  points = [];
  
  for (var i = 0; i < vertices.length; i += 3) {
    triangle(vertices[i + 0], vertices[i + 1], vertices[i + 2], tessellation, fill);
  }
  
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  render();
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (fill == 3 || fill == 4) {
    gl.drawArrays(gl.LINES, 0, points.length);
  } else {
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
  }
}


function triangle(a, b, c, count, fill) {

  if (count === 0) {
    if (twist) {
      var da = Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2)) * (rotate * Math.PI / 180.0);
      var db = Math.sqrt(Math.pow(b[0], 2) + Math.pow(b[1], 2)) * (rotate * Math.PI / 180.0);
      var dc = Math.sqrt(Math.pow(c[0], 2) + Math.pow(c[1], 2)) * (rotate * Math.PI / 180.0);
  } else {
    var da = (rotate * Math.PI / 180.0);
    var db = (rotate * Math.PI / 180.0);
    var dc = (rotate * Math.PI / 180.0);
  }
    
    var ap = vec2(
      (a[0] * Math.cos(da)) - (a[1] * Math.sin(da)),
      (a[0] * Math.sin(da)) + (a[1] * Math.cos(da)));
    var bp = vec2(
      (b[0] * Math.cos(db)) - (b[1] * Math.sin(db)),
      (b[0] * Math.sin(db)) + (b[1] * Math.cos(db)));
    var cp = vec2(
      (c[0] * Math.cos(dc)) - (c[1] * Math.sin(dc)),
      (c[0] * Math.sin(dc)) + (c[1] * Math.cos(dc)));
    
    if (fill == 3 || fill == 4) {
      points.push(ap, bp, ap, cp, bp, cp);
    } else {
      points.push(ap, bp, cp);
    }
    
   return;
  }

  var ab = mix(a, b, 0.5);
  var ac = mix(a, c, 0.5);
  var bc = mix(b, c, 0.5);

  triangle(a, ab, ac, (count - 1), fill);
  triangle(b, bc, ab, (count - 1), fill);
  triangle(c, ac, bc, (count - 1), fill);
  if (fill == 1 || fill == 3) {
    triangle(ab, ac, bc, (count - 1), fill);
  }
}
