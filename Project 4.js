// Define floating point EPSILON value
const EPSILON = 0.000001;


//Objects
//Represents the pixels that will be drawn to the screen
class PixelBuffer {
    constructor(height, width, defaultColor) {
        this.height = height;
        this.width = width;
        this.defaultColor = defaultColor;

        this.colorArray = [];
        for ( let i = 0; i < this.height; i++ ) {
            this.colorArray[i] = [];
            for( let j = 0; j < this.width; j++ ) {
                this.colorArray[i][j] = defaultColor;
            }
        }
    }

    getHeight() {
        return this.height;
    }

    getWidth() {
        return this.width;
    }

    setColor(row,column,color) {
        this.colorArray[row][column] = color;
    }

    getColor(row,column) {
        return this.colorArray[row][column];
    }

    //Draws the pixel to the point array that will be loaded into the gpu
    draw( pointArray ) {
        for ( let i = 0; i < this.height; i++ ) {
            for( let j = 0; j < this.width; j++ ) {
                let x0 = j*(2/this.width) - 1;
                let x1 = (j+1)*(2/this.width) - 1;
                let y0 = 1-i*(2/this.height);
                let y1 = 1-(i+1)*(2/this.height);
                pointArray.push(vec2(x0,y0));
                pointArray.push(vec2(x0,y1));
                pointArray.push(vec2(x1,y0));
                pointArray.push(vec2(x1,y1));
                pointArray.push(vec2(x0,y1));
                pointArray.push(vec2(x1,y0));
            }
        }
    }
}

//Stores viewer location
class Viewer {
    constructor(location){
        this.location = location;
    }

    getLocation(){
        return this.location;
    }

    createViewPanel() {
        throw "Viewer.createViewPanel not implemented";
    }
}

//Panel that the viewer looks through to see the scene
class ViewPanel{
    constructor(topLeft, topRight, bottomLeft, pixelRows, pixelColumns){
        this.topLeft = topLeft;
        this.topRight = topRight;
        this.bottomLeft = bottomLeft;
        this.pixelRows = pixelRows;
        this.pixelColumns = pixelColumns;

        this.displaceXrow = (bottomLeft[0] - topLeft[0])/pixelRows;
        this.displaceYrow = (bottomLeft[1] - topLeft[1])/pixelRows;
        this.displaceZrow = (bottomLeft[2] - topLeft[2])/pixelRows;

        this.displaceXcolumn = (topRight[0] - topLeft[0])/pixelColumns;
        this.displaceYcolumn = (topRight[1] - topLeft[1])/pixelColumns;
        this.displaceZcolumn = (topRight[2] - topLeft[2])/pixelColumns;
    }

    getCenter(row, column){
        return vec3(
            (row+0.5)*displaceXrow + (column+0.5)*displaceXcolumn + topLeft[0],
            (row+0.5)*displaceYrow + (column+0.5)*displaceYcolumn + topLeft[1],
            (row+0.5)*displaceZrow + (column+0.5)*displaceZcolumn + topLeft[2]
            );
    }
}

//Clipping cube of the scene
class ClippingCube{
    constructor(triangles){
        this.triangles = triangles;
    }

    getRayInCube(ray){
        let intersectionTs = [];
        for(let i = 0; i < this.triangles.length; i++){
            let intersectT = this.triangles[i].getIntersectionT(ray);
            if(intersectT){
                intersectionTs.push(intersectT);
            }
        }
        if(intersectionTs.length === 2) {
            let point1 = ray.getPointAtT(intersectionTs[0]);
            let point2 = ray.getPointAtT(intersectionTs[1]);
            if(intersectionTs[0] < intersectionTs[1]) {
                return new Ray(point1,point2);
            }
            return new Ray(point2,point1);
        } else {
            return false;
        }
    }

    static createClip(viewer, view, models) {
        console.log("ClippingCube.createClip not implemented");
        console.log(models)
        let t = [];
        for (let i = 0; i < models.length; i++) {
            console.log(i, models[i])
            t = t.concat(models[i].triangles);
        }
        return new ClippingCube(t);
    }
}

//Models an object in the scene
class Model{
    constructor(triangles){
        this.triangles = triangles;
    }

    getIntersectionTriangle(ray){
        let minimumT = this.triangles[0].getIntersectionT(ray);
        let minimumTriangle = this.triangles[0];
        for(let i = 1; i < this.triangles.length; i++){
            let intersectT = this.triangles[i].getIntersectionT(ray);
            if(intersectT){
                if(!minimumT || (intersectT < minimumT)){
                    minimumT = intersectT;
                    minimumTriangle = this.triangles[i];
                }
            }
        }
        return minimumTriangle;
    }

    static createCube(x, y, z, s, color) {
        let p = [
            null, // started with 1 not 0, adding this is easier than changing numbers below
            vec3(x+s, y, z),
            vec3(x+s, y+s, z),
            vec3(x, y+s, z),
            vec3(x, y, z),
            vec3(x+s, y, z+s),
            vec3(x+s, y+s, z+s),
            vec3(x, y+s, z+s),
            vec3(x, y, z+s)
        ];
        let m =
            new Model([
                new Triangle([ p[1], p[2], p[4] ], color),
                new Triangle([ p[2], p[3], p[4] ], color),
                new Triangle([ p[5], p[6], p[1] ], color),
                new Triangle([ p[6], p[2], p[1] ], color),
                new Triangle([ p[4], p[3], p[7] ], color),
                new Triangle([ p[3], p[7], p[8] ], color),
                new Triangle([ p[7], p[6], p[8] ], color),
                new Triangle([ p[6], p[5], p[8] ], color)
            ]);
        return m;
        //what an amusing meme. it will return undefined if we do `return new Model(...);` but works fine when we do `let m = new Model(...); return m;`
    }
}

//Represents a ray
class Ray {
    constructor(startPoint, endPoint){
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.D = sub(endPoint, startPoint);
    }

    getPointAtT(t){
        return vex3(
            (endPoint[0] - startPoint[0])*t,
            (endPoint[1] - startPoint[1])*t,
            (endPoint[2] - startPoint[2])*t
        );
    }
}

//Represents a triangle
class Triangle {
    //vertexes should be a list of 3 vec4 elements
    constructor(vertexes,color){
        this.vertexes = vertexes;
        this.color = color;
        // U and V used for normal and Möller–Trumbore
        this.U = sub(vertexes[1], vertexes[0]);
        this.V = sub(vertexes[2], vertexes[0]);
        //compute normal here so we only have to do that once, not every time we draw
        //counter-clockwise winding to match OpenGL/WebGL
        this.normal = cross(this.U, this.V)
    }

    getNormal(){
        return this.normal
    }

    getColor(){
        return this.color;
    }

    // Implementation of Möller–Trumbore ray-triangle intersection algorithm
    getIntersectionT(ray){
        let P = cross(ray.D, this.V);
        let det = dot(this.U, P);
        if (Math.abs(det) < EPSILON) // det ~= 0 ==> ray parallel to triangle ==> cull
            return NaN;
        let inv = 1.0/det;
        let T = sub(ray.startPoint, this.vertexes[0]);
        let u = dot(T, P) * inv;
        if ( (u < 0) || (u > 1.0) ) // outside triangle ==> cull
            return NaN;
        let Q = cross(T, U);
        let v = dot(ray.D, Q) * inv;
        if ( (v < 0) || (v > 1.0) ) // outside triangle ==> cull
            return NaN;
        let t = DOT(e2, Q) * inv;
        if ( t < 0 ) // triangle is behind start of ray ==> cull
            return NaN;
        return t;
    }
}

// Vector helper functions
function sub(U, V) {
    return [
        U[0] - V[0],
        U[1] - V[1],
        U[2] - V[2]
    ];
}

function dot(U, V) {
    return (
        (U[0] * V[0]) +
        (U[1] * V[1]) +
        (U[2] * V[2])
    );
}

function cross(U, V) {
    return vec3(
        (U[1] * V[2]) - (U[2] * V[1]), // N.x = (U.y * V.z) - (U.z * V.y)
        (U[2] * V[0]) - (U[0] * V[2]), // N.y = (U.z * V.x) - (U.x * V.z)
        (U[0] * V[1]) - (U[1] * V[0]) // N.z = (U.x * V.y) - (U.y * V.x)
    );
}


//Globals needed for all the functions
let gl;
let points = [];

let height = 500;
let width = 500;
let colorArray = [];

var pixelBuffer = new PixelBuffer(500,500, vec4(0.0, 0.0, 0.0, 1.0));

window.onload = function init()
{
    let canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    let program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Create scene

    console.log("CREATING MODELS...");

        let models = [
            Model.createCube(0, 0, 0, 1, vec4(0.0, 0.0, 1.0, 1.0)),
            Model.createCube(-1, 2, 4, 1.5, vec4(0.0, 0.0, 1.0, 1.0))
        ];

        //for future debugging
        console.log("\tModels: ", models);

    console.log("CREATING VIEWER, VIEWPANEL...");

        //Todo: some fancy logic of determining a good view panel ->  Viewer.createViewPanel()
        let viewer = new Viewer(vec3[0, 0, -10]);
        let view = new ViewPanel(
            vec3(-2.5, 2.5, -5), vec3(-2.5, 2.5, -5), vec3(-2.5, -2.5, -5),
            pixelBuffer.getHeight(), pixelBuffer.getWidth()
        );

        //for future debugging
        console.log("\tViewer: ", viewer);
        console.log("\tViewPanel: ", view);

    console.log("CREATING CLIPPING CUBE...");

        //Todo: clipping. This method isn't implemented correctly
        let cc = ClippingCube.createClip(viewer, view, models);


    console.log("PRE-RENDERING PIXELBUFFER...");

        //Todo: rendering
        console.log("Need to do pixelbuffer stuff");

    // Draw buffer

    console.log("PIXELBUFFER DRAWING...");
    pixelBuffer.draw(points)

    // Load the data into the GPU
    
    let bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate our shader variables with our data buffer
    
    let vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    colorLoc = gl.getUniformLocation (program, "color");

    render();
};


function render() {
    console.log("Rendering pixels")
    gl.clear( gl.COLOR_BUFFER_BIT );
    index = 0;
    for ( let i = 0; i < pixelBuffer.getHeight() ; i++ ) {
        for( let j = 0; j < pixelBuffer.getWidth() ; j++ ) {
            gl.uniform4fv(colorLoc, pixelBuffer.getColor(i,j));
            gl.drawArrays( gl.TRIANGLES, index, 6);
            index += 6;
        }
    }
}
