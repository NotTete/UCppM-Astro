export function createShader(gl: WebGL2RenderingContext, type: GLenum, source: string) : WebGLShader | null {
    var shader = gl.createShader(type);

    if(!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);

    return null;
} 

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) : WebGLProgram | null {
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

export function compileShader(gl: WebGL2RenderingContext, fragmentSource: string, vertexSource: string) : WebGLProgram | null {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);

    if(!vertexShader) return null;

    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if(!fragmentShader) {
        gl.deleteShader(vertexShader);
        return null;
    }

    var program = createProgram(gl, vertexShader, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}