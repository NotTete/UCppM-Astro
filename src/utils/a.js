import { fps } from './scroll.js';

const vertexShaderSource = `#version 300 es
in vec4 a_position;
out vec2 uv;
void main() {
    uv = a_position.xy;
    gl_Position = a_position;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec2 uv;
out vec4 outColor;

uniform vec2 u_res;
uniform float u_time;

vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                     dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                     dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}

void main()
{
    vec2 pos = uv * u_res;

    vec3 c1 = vec3(0.0, 0.15, 0.25);
    vec3 c2 = vec3(0.05, 0.05, 0.1);
    
    vec2 dir = normalize(vec2(1.0, 2.0));
    float zoom = 2.5;

    float t = u_time * 0.1;

    float n = sin(noise(noise(noise(pos * zoom + dir * t) * uv * uv) * uv * uv));
    float div = 8.;
    
    float m = floor(div * n) / div;
    float k = n - m;
    vec3 color = mix(c1, c2, m);
    color = mix(color, color * 1.2, k * div);
    outColor = vec4(color, 1.0);
}`;

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function compileShader(gl, fragmentSource, vertexSource) {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = createProgram(gl, vertexShader, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}

export function initBackground() {
    canvas = document.getElementById("background-canvas");

    let timeOffset = sessionStorage.getItem('offset-animation');
    if(timeOffset == null) timeOffset = 0;
    else timeOffset = parseFloat(timeOffset);


    // Get OpenGL context
    const gl = canvas.getContext("webgl2");
    if(gl == null) {
        console.log("WebGL not supported");
        return;
    }

    // Compile shader
    const program = compileShader(gl, fragmentShaderSource, vertexShaderSource);
    
    // Get uniform location
    var timeLocation = gl.getUniformLocation(program, "u_time");
    var resolutionLocation = gl.getUniformLocation(program, "u_res");

    // Bind buffer position
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    var positions = [
        -1, -1,
        -1, 1,
        1, 1,
        1, -1,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttributeLocation);

    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset
    );


    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    requestAnimationFrame(drawScene);

    function drawScene(now) {
        setTimeout(function () {
            resizeCanvasToDisplaySize(gl.canvas);
            requestAnimationFrame(drawScene);

            now *= 0.001;  // convert to seconds
            now += timeOffset;

            sessionStorage.setItem('offset-animation', now + 0.5);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // Clear the canvas
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Tell it to use our program (pair of shaders)
            gl.useProgram(program);

            // Bind the attribute/buffer set we want.
            gl.bindVertexArray(vao);

            gl.uniform1f(timeLocation, now);

            if(gl.canvas.width > gl.canvas.height) {
                gl.uniform2f(resolutionLocation, gl.canvas.width / gl.canvas.height, 1);
            } else {
                gl.uniform2f(resolutionLocation, 1, gl.canvas.height / gl.canvas.width);
            }

            // Draw the line
            var primitiveType = gl.TRIANGLE_FAN;
            var offset = 0;
            var count = 4;
            gl.drawArrays(primitiveType, offset, count);
            }, 1000 / fps()
        );
    }

    const canvasToDisplaySizeMap = new Map([[canvas, [300, 150]]]);

    function onResize(entries) {
        for (const entry of entries) {
        let width;
        let height;
        let dpr = window.devicePixelRatio;
        if (entry.devicePixelContentBoxSize) {
            // NOTE: Only this path gives the correct answer
            // The other 2 paths are an imperfect fallback
            // for browsers that don't provide anyway to do this
            width = entry.devicePixelContentBoxSize[0].inlineSize;
            height = entry.devicePixelContentBoxSize[0].blockSize;
            dpr = 1; // it's already in width and height
        } else if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
            width = entry.contentBoxSize[0].inlineSize;
            height = entry.contentBoxSize[0].blockSize;
            } else {
            // legacy
            width = entry.contentBoxSize.inlineSize;
            height = entry.contentBoxSize.blockSize;
            }
        } else {
            // legacy
            width = entry.contentRect.width;
            height = entry.contentRect.height;
        }
        const displayWidth = Math.round(width * dpr);
        const displayHeight = Math.round(height * dpr);
        canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
        }
    }

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas, {box: 'content-box'});

    function resizeCanvasToDisplaySize(canvas) {
        // Get the size the browser is displaying the canvas in device pixels.
        const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

        // Check if the canvas is not the same size.
        const needResize = canvas.width  !== displayWidth ||
                        canvas.height !== displayHeight;

        if (needResize) {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
        }

        return needResize;
    }
}import { fps } from './scroll.js';

const vertexShaderSource = `#version 300 es
in vec4 a_position;
out vec2 uv;
void main() {
    uv = a_position.xy;
    gl_Position = a_position;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec2 uv;
out vec4 outColor;

uniform vec2 u_res;
uniform float u_time;

vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                     dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                     dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}

void main()
{
    vec2 pos = uv * u_res;

    vec3 c1 = vec3(0.0, 0.15, 0.25);
    vec3 c2 = vec3(0.05, 0.05, 0.1);
    
    vec2 dir = normalize(vec2(1.0, 2.0));
    float zoom = 2.5;

    float t = u_time * 0.1;

    float n = sin(noise(noise(noise(pos * zoom + dir * t) * uv * uv) * uv * uv));
    float div = 8.;
    
    float m = floor(div * n) / div;
    float k = n - m;
    vec3 color = mix(c1, c2, m);
    color = mix(color, color * 1.2, k * div);
    outColor = vec4(color, 1.0);
}`;

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function compileShader(gl, fragmentSource, vertexSource) {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = createProgram(gl, vertexShader, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}

export function initBackground() {
    canvas = document.getElementById("background-canvas");

    let timeOffset = sessionStorage.getItem('offset-animation');
    if(timeOffset == null) timeOffset = 0;
    else timeOffset = parseFloat(timeOffset);


    // Get OpenGL context
    const gl = canvas.getContext("webgl2");
    if(gl == null) {
        console.log("WebGL not supported");
        return;
    }

    // Compile shader
    const program = compileShader(gl, fragmentShaderSource, vertexShaderSource);
    
    // Get uniform location
    var timeLocation = gl.getUniformLocation(program, "u_time");
    var resolutionLocation = gl.getUniformLocation(program, "u_res");

    // Bind buffer position
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    var positions = [
        -1, -1,
        -1, 1,
        1, 1,
        1, -1,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttributeLocation);

    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset
    );


    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    requestAnimationFrame(drawScene);

    function drawScene(now) {
        setTimeout(function () {
            resizeCanvasToDisplaySize(gl.canvas);
            requestAnimationFrame(drawScene);

            now *= 0.001;  // convert to seconds
            now += timeOffset;

            sessionStorage.setItem('offset-animation', now + 0.5);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // Clear the canvas
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Tell it to use our program (pair of shaders)
            gl.useProgram(program);

            // Bind the attribute/buffer set we want.
            gl.bindVertexArray(vao);

            gl.uniform1f(timeLocation, now);

            if(gl.canvas.width > gl.canvas.height) {
                gl.uniform2f(resolutionLocation, gl.canvas.width / gl.canvas.height, 1);
            } else {
                gl.uniform2f(resolutionLocation, 1, gl.canvas.height / gl.canvas.width);
            }

            // Draw the line
            var primitiveType = gl.TRIANGLE_FAN;
            var offset = 0;
            var count = 4;
            gl.drawArrays(primitiveType, offset, count);
            }, 1000 / fps()
        );
    }

    const canvasToDisplaySizeMap = new Map([[canvas, [300, 150]]]);

    function onResize(entries) {
        for (const entry of entries) {
        let width;
        let height;
        let dpr = window.devicePixelRatio;
        if (entry.devicePixelContentBoxSize) {
            // NOTE: Only this path gives the correct answer
            // The other 2 paths are an imperfect fallback
            // for browsers that don't provide anyway to do this
            width = entry.devicePixelContentBoxSize[0].inlineSize;
            height = entry.devicePixelContentBoxSize[0].blockSize;
            dpr = 1; // it's already in width and height
        } else if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
            width = entry.contentBoxSize[0].inlineSize;
            height = entry.contentBoxSize[0].blockSize;
            } else {
            // legacy
            width = entry.contentBoxSize.inlineSize;
            height = entry.contentBoxSize.blockSize;
            }
        } else {
            // legacy
            width = entry.contentRect.width;
            height = entry.contentRect.height;
        }
        const displayWidth = Math.round(width * dpr);
        const displayHeight = Math.round(height * dpr);
        canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
        }
    }

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observeimport { fps } from './scroll.js';

const vertexShaderSource = `#version 300 es
in vec4 a_position;
out vec2 uv;
void main() {
    uv = a_position.xy;
    gl_Position = a_position;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec2 uv;
out vec4 outColor;

uniform vec2 u_res;
uniform float u_time;

vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                     dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                     dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}

void main()
{
    vec2 pos = uv * u_res;

    vec3 c1 = vec3(0.0, 0.15, 0.25);
    vec3 c2 = vec3(0.05, 0.05, 0.1);
    
    vec2 dir = normalize(vec2(1.0, 2.0));
    float zoom = 2.5;

    float t = u_time * 0.1;

    float n = sin(noise(noise(noise(pos * zoom + dir * t) * uv * uv) * uv * uv));
    float div = 8.;
    
    float m = floor(div * n) / div;
    float k = n - m;
    vec3 color = mix(c1, c2, m);
    color = mix(color, color * 1.2, k * div);
    outColor = vec4(color, 1.0);
}`;

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function compileShader(gl, fragmentSource, vertexSource) {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = createProgram(gl, vertexShader, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}

export function initBackground() {
    canvas = document.getElementById("background-canvas");

    let timeOffset = sessionStorage.getItem('offset-animation');
    if(timeOffset == null) timeOffset = 0;
    else timeOffset = parseFloat(timeOffset);


    // Get OpenGL context
    const gl = canvas.getContext("webgl2");
    if(gl == null) {
        console.log("WebGL not supported");
        return;
    }

    // Compile shader
    const program = compileShader(gl, fragmentShaderSource, vertexShaderSource);
    
    // Get uniform location
    var timeLocation = gl.getUniformLocation(program, "u_time");
    var resolutionLocation = gl.getUniformLocation(program, "u_res");

    // Bind buffer position
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    var positions = [
        -1, -1,
        -1, 1,
        1, 1,
        1, -1,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttributeLocation);

    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset
    );


    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    requestAnimationFrame(drawScene);

    function drawScene(now) {
        setTimeout(function () {
            resizeCanvasToDisplaySize(gl.canvas);
            requestAnimationFrame(drawScene);

            now *= 0.001;  // convert to seconds
            now += timeOffset;

            sessionStorage.setItem('offset-animation', now + 0.5);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // Clear the canvas
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Tell it to use our program (pair of shaders)
            gl.useProgram(program);

            // Bind the attribute/buffer set we want.
            gl.bindVertexArray(vao);

            gl.uniform1f(timeLocation, now);

            if(gl.canvas.width > gl.canvas.height) {
                gl.uniform2f(resolutionLocation, gl.canvas.width / gl.canvas.height, 1);
            } else {
                gl.uniform2f(resolutionLocation, 1, gl.canvas.height / gl.canvas.width);
            }

            // Draw the line
            var primitiveType = gl.TRIANGLE_FAN;
            var offset = 0;
            var count = 4;
            gl.drawArrays(primitiveType, offset, count);
            }, 1000 / fps()
        );
    }

    const canvasToDisplaySizeMap = new Map([[canvas, [300, 150]]]);

    function onResize(entries) {
        for (const entry of entries) {
        let width;
        let height;
        let dpr = window.devicePixelRatio;
        if (entry.devicePixelContentBoxSize) {
            // NOTE: Only this path gives the correct answer
            // The other 2 paths are an imperfect fallback
            // for browsers that don't provide anyway to do this
            width = entry.devicePixelContentBoxSize[0].inlineSize;
            height = entry.devicePixelContentBoxSize[0].blockSize;
            dpr = 1; // it's already in width and height
        } else if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
            width = entry.contentBoxSize[0].inlineSize;
            height = entry.contentBoxSize[0].blockSize;
            } else {
            // legacy
            width = entry.contentBoxSize.inlineSize;
            height = entry.contentBoxSize.blockSize;
            }
        } else {
            // legacy
            width = entry.contentRect.width;
            height = entry.contentRect.height;
        }
        const displayWidth = Math.round(width * dpr);
        const displayHeight = Math.round(height * dpr);
        canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
        }
    }

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas, {box: 'content-box'});

    function resizeCanvasToDisplaySize(canvas) {
        // Get the size the browser is displaying the canvas in device pixels.
        const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

        // Check if the canvas is not the same size.
        const needResize = canvas.width  !== displayWidth ||
                        canvas.height !== displayHeight;

        if (needResize) {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
        }

        return needResize;
    }
}(canvas, {box: 'content-box'});

    function resizeCanvasToDisplaySize(canvas) {
        // Get the size the browser is displaying the canvas in device pixels.
        const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

        // Check if the canvas is not the same size.
        const needResize = canvas.width  !== displayWidth ||
                        canvas.height !== displayHeight;

        if (needResize) {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
        }

        return needResize;
    }
}