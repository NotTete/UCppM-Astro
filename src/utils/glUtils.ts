export function createShader(gl: WebGL2RenderingContext, type: GLenum, source) {
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

export function createProgram(gl: WebGL2RenderingContext, vertexShader: string, fragmentShader: string) : WebGLProgram | null {
    var program: WebGLProgram = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    } else {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    

}

function compileShader(gl, fragmentSource, vertexSource) {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = createProgram(gl, vertexShader, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}