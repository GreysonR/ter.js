(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("ter", [], factory);
	else if(typeof exports === 'object')
		exports["ter"] = factory();
	else
		root["ter"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 371:
/***/ ((module) => {

module.exports = {
    decomp: polygonDecomp,
    quickDecomp: polygonQuickDecomp,
    isSimple: polygonIsSimple,
    removeCollinearPoints: polygonRemoveCollinearPoints,
    removeDuplicatePoints: polygonRemoveDuplicatePoints,
    makeCCW: polygonMakeCCW
};

/**
 * Compute the intersection between two lines.
 * @static
 * @method lineInt
 * @param  {Array}  l1          Line vector 1
 * @param  {Array}  l2          Line vector 2
 * @param  {Number} precision   Precision to use when checking if the lines are parallel
 * @return {Array}              The intersection point.
 */
function lineInt(l1,l2,precision){
    precision = precision || 0;
    var i = [0,0]; // point
    var a1, b1, c1, a2, b2, c2, det; // scalars
    a1 = l1[1][1] - l1[0][1];
    b1 = l1[0][0] - l1[1][0];
    c1 = a1 * l1[0][0] + b1 * l1[0][1];
    a2 = l2[1][1] - l2[0][1];
    b2 = l2[0][0] - l2[1][0];
    c2 = a2 * l2[0][0] + b2 * l2[0][1];
    det = a1 * b2 - a2*b1;
    if (!scalar_eq(det, 0, precision)) { // lines are not parallel
        i[0] = (b2 * c1 - b1 * c2) / det;
        i[1] = (a1 * c2 - a2 * c1) / det;
    }
    return i;
}

/**
 * Checks if two line segments intersects.
 * @method segmentsIntersect
 * @param {Array} p1 The start vertex of the first line segment.
 * @param {Array} p2 The end vertex of the first line segment.
 * @param {Array} q1 The start vertex of the second line segment.
 * @param {Array} q2 The end vertex of the second line segment.
 * @return {Boolean} True if the two line segments intersect
 */
function lineSegmentsIntersect(p1, p2, q1, q2){
	var dx = p2[0] - p1[0];
	var dy = p2[1] - p1[1];
	var da = q2[0] - q1[0];
	var db = q2[1] - q1[1];

	// segments are parallel
	if((da*dy - db*dx) === 0){
		return false;
	}

	var s = (dx * (q1[1] - p1[1]) + dy * (p1[0] - q1[0])) / (da * dy - db * dx);
	var t = (da * (p1[1] - q1[1]) + db * (q1[0] - p1[0])) / (db * dx - da * dy);

	return (s>=0 && s<=1 && t>=0 && t<=1);
}

/**
 * Get the area of a triangle spanned by the three given points. Note that the area will be negative if the points are not given in counter-clockwise order.
 * @static
 * @method area
 * @param  {Array} a
 * @param  {Array} b
 * @param  {Array} c
 * @return {Number}
 */
function triangleArea(a,b,c){
    return (((b[0] - a[0])*(c[1] - a[1]))-((c[0] - a[0])*(b[1] - a[1])));
}

function isLeft(a,b,c){
    return triangleArea(a,b,c) > 0;
}

function isLeftOn(a,b,c) {
    return triangleArea(a, b, c) >= 0;
}

function isRight(a,b,c) {
    return triangleArea(a, b, c) < 0;
}

function isRightOn(a,b,c) {
    return triangleArea(a, b, c) <= 0;
}

var tmpPoint1 = [],
    tmpPoint2 = [];

/**
 * Check if three points are collinear
 * @method collinear
 * @param  {Array} a
 * @param  {Array} b
 * @param  {Array} c
 * @param  {Number} [thresholdAngle=0] Threshold angle to use when comparing the vectors. The function will return true if the angle between the resulting vectors is less than this value. Use zero for max precision.
 * @return {Boolean}
 */
function collinear(a,b,c,thresholdAngle) {
    if(!thresholdAngle){
        return triangleArea(a, b, c) === 0;
    } else {
        var ab = tmpPoint1,
            bc = tmpPoint2;

        ab[0] = b[0]-a[0];
        ab[1] = b[1]-a[1];
        bc[0] = c[0]-b[0];
        bc[1] = c[1]-b[1];

        var dot = ab[0]*bc[0] + ab[1]*bc[1],
            magA = Math.sqrt(ab[0]*ab[0] + ab[1]*ab[1]),
            magB = Math.sqrt(bc[0]*bc[0] + bc[1]*bc[1]),
            angle = Math.acos(dot/(magA*magB));
        return angle < thresholdAngle;
    }
}

function sqdist(a,b){
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    return dx * dx + dy * dy;
}

/**
 * Get a vertex at position i. It does not matter if i is out of bounds, this function will just cycle.
 * @method at
 * @param  {Number} i
 * @return {Array}
 */
function polygonAt(polygon, i){
    var s = polygon.length;
    return polygon[i < 0 ? i % s + s : i % s];
}

/**
 * Clear the polygon data
 * @method clear
 * @return {Array}
 */
function polygonClear(polygon){
    polygon.length = 0;
}

/**
 * Append points "from" to "to"-1 from an other polygon "poly" onto this one.
 * @method append
 * @param {Polygon} poly The polygon to get points from.
 * @param {Number}  from The vertex index in "poly".
 * @param {Number}  to The end vertex index in "poly". Note that this vertex is NOT included when appending.
 * @return {Array}
 */
function polygonAppend(polygon, poly, from, to){
    for(var i=from; i<to; i++){
        polygon.push(poly[i]);
    }
}

/**
 * Make sure that the polygon vertices are ordered counter-clockwise.
 * @method makeCCW
 */
function polygonMakeCCW(polygon){
    var br = 0,
        v = polygon;

    // find bottom right point
    for (var i = 1; i < polygon.length; ++i) {
        if (v[i][1] < v[br][1] || (v[i][1] === v[br][1] && v[i][0] > v[br][0])) {
            br = i;
        }
    }

    // reverse poly if clockwise
    if (!isLeft(polygonAt(polygon, br - 1), polygonAt(polygon, br), polygonAt(polygon, br + 1))) {
        polygonReverse(polygon);
        return true;
    } else {
        return false;
    }
}

/**
 * Reverse the vertices in the polygon
 * @method reverse
 */
function polygonReverse(polygon){
    var tmp = [];
    var N = polygon.length;
    for(var i=0; i!==N; i++){
        tmp.push(polygon.pop());
    }
    for(var i=0; i!==N; i++){
		polygon[i] = tmp[i];
    }
}

/**
 * Check if a point in the polygon is a reflex point
 * @method isReflex
 * @param  {Number}  i
 * @return {Boolean}
 */
function polygonIsReflex(polygon, i){
    return isRight(polygonAt(polygon, i - 1), polygonAt(polygon, i), polygonAt(polygon, i + 1));
}

var tmpLine1=[],
    tmpLine2=[];

/**
 * Check if two vertices in the polygon can see each other
 * @method canSee
 * @param  {Number} a Vertex index 1
 * @param  {Number} b Vertex index 2
 * @return {Boolean}
 */
function polygonCanSee(polygon, a,b) {
    var p, dist, l1=tmpLine1, l2=tmpLine2;

    if (isLeftOn(polygonAt(polygon, a + 1), polygonAt(polygon, a), polygonAt(polygon, b)) && isRightOn(polygonAt(polygon, a - 1), polygonAt(polygon, a), polygonAt(polygon, b))) {
        return false;
    }
    dist = sqdist(polygonAt(polygon, a), polygonAt(polygon, b));
    for (var i = 0; i !== polygon.length; ++i) { // for each edge
        if ((i + 1) % polygon.length === a || i === a){ // ignore incident edges
            continue;
        }
        if (isLeftOn(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i + 1)) && isRightOn(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i))) { // if diag intersects an edge
            l1[0] = polygonAt(polygon, a);
            l1[1] = polygonAt(polygon, b);
            l2[0] = polygonAt(polygon, i);
            l2[1] = polygonAt(polygon, i + 1);
            p = lineInt(l1,l2);
            if (sqdist(polygonAt(polygon, a), p) < dist) { // if edge is blocking visibility to b
                return false;
            }
        }
    }

    return true;
}

/**
 * Check if two vertices in the polygon can see each other
 * @method canSee2
 * @param  {Number} a Vertex index 1
 * @param  {Number} b Vertex index 2
 * @return {Boolean}
 */
function polygonCanSee2(polygon, a,b) {
    // for each edge
    for (var i = 0; i !== polygon.length; ++i) {
        // ignore incident edges
        if (i === a || i === b || (i + 1) % polygon.length === a || (i + 1) % polygon.length === b){
            continue;
        }
        if( lineSegmentsIntersect(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i), polygonAt(polygon, i+1)) ){
            return false;
        }
    }
    return true;
}

/**
 * Copy the polygon from vertex i to vertex j.
 * @method copy
 * @param  {Number} i
 * @param  {Number} j
 * @param  {Polygon} [targetPoly]   Optional target polygon to save in.
 * @return {Polygon}                The resulting copy.
 */
function polygonCopy(polygon, i,j,targetPoly){
    var p = targetPoly || [];
    polygonClear(p);
    if (i < j) {
        // Insert all vertices from i to j
        for(var k=i; k<=j; k++){
            p.push(polygon[k]);
        }

    } else {

        // Insert vertices 0 to j
        for(var k=0; k<=j; k++){
            p.push(polygon[k]);
        }

        // Insert vertices i to end
        for(var k=i; k<polygon.length; k++){
            p.push(polygon[k]);
        }
    }

    return p;
}

/**
 * Decomposes the polygon into convex pieces. Returns a list of edges [[p1,p2],[p2,p3],...] that cuts the polygon.
 * Note that this algorithm has complexity O(N^4) and will be very slow for polygons with many vertices.
 * @method getCutEdges
 * @return {Array}
 */
function polygonGetCutEdges(polygon) {
    var min=[], tmp1=[], tmp2=[], tmpPoly = [];
    var nDiags = Number.MAX_VALUE;

    for (var i = 0; i < polygon.length; ++i) {
        if (polygonIsReflex(polygon, i)) {
            for (var j = 0; j < polygon.length; ++j) {
                if (polygonCanSee(polygon, i, j)) {
                    tmp1 = polygonGetCutEdges(polygonCopy(polygon, i, j, tmpPoly));
                    tmp2 = polygonGetCutEdges(polygonCopy(polygon, j, i, tmpPoly));

                    for(var k=0; k<tmp2.length; k++){
                        tmp1.push(tmp2[k]);
                    }

                    if (tmp1.length < nDiags) {
                        min = tmp1;
                        nDiags = tmp1.length;
                        min.push([polygonAt(polygon, i), polygonAt(polygon, j)]);
                    }
                }
            }
        }
    }

    return min;
}

/**
 * Decomposes the polygon into one or more convex sub-Polygons.
 * @method decomp
 * @return {Array} An array or Polygon objects.
 */
function polygonDecomp(polygon){
    var edges = polygonGetCutEdges(polygon);
    if(edges.length > 0){
        return polygonSlice(polygon, edges);
    } else {
        return [polygon];
    }
}

/**
 * Slices the polygon given one or more cut edges. If given one, this function will return two polygons (false on failure). If many, an array of polygons.
 * @method slice
 * @param {Array} cutEdges A list of edges, as returned by .getCutEdges()
 * @return {Array}
 */
function polygonSlice(polygon, cutEdges){
    if(cutEdges.length === 0){
		return [polygon];
    }
    if(cutEdges instanceof Array && cutEdges.length && cutEdges[0] instanceof Array && cutEdges[0].length===2 && cutEdges[0][0] instanceof Array){

        var polys = [polygon];

        for(var i=0; i<cutEdges.length; i++){
            var cutEdge = cutEdges[i];
            // Cut all polys
            for(var j=0; j<polys.length; j++){
                var poly = polys[j];
                var result = polygonSlice(poly, cutEdge);
                if(result){
                    // Found poly! Cut and quit
                    polys.splice(j,1);
                    polys.push(result[0],result[1]);
                    break;
                }
            }
        }

        return polys;
    } else {

        // Was given one edge
        var cutEdge = cutEdges;
        var i = polygon.indexOf(cutEdge[0]);
        var j = polygon.indexOf(cutEdge[1]);

        if(i !== -1 && j !== -1){
            return [polygonCopy(polygon, i,j),
                    polygonCopy(polygon, j,i)];
        } else {
            return false;
        }
    }
}

/**
 * Checks that the line segments of this polygon do not intersect each other.
 * @method isSimple
 * @param  {Array} path An array of vertices e.g. [[0,0],[0,1],...]
 * @return {Boolean}
 * @todo Should it check all segments with all others?
 */
function polygonIsSimple(polygon){
    var path = polygon, i;
    // Check
    for(i=0; i<path.length-1; i++){
        for(var j=0; j<i-1; j++){
            if(lineSegmentsIntersect(path[i], path[i+1], path[j], path[j+1] )){
                return false;
            }
        }
    }

    // Check the segment between the last and the first point to all others
    for(i=1; i<path.length-2; i++){
        if(lineSegmentsIntersect(path[0], path[path.length-1], path[i], path[i+1] )){
            return false;
        }
    }

    return true;
}

function getIntersectionPoint(p1, p2, q1, q2, delta){
	delta = delta || 0;
	var a1 = p2[1] - p1[1];
	var b1 = p1[0] - p2[0];
	var c1 = (a1 * p1[0]) + (b1 * p1[1]);
	var a2 = q2[1] - q1[1];
	var b2 = q1[0] - q2[0];
	var c2 = (a2 * q1[0]) + (b2 * q1[1]);
	var det = (a1 * b2) - (a2 * b1);

	if(!scalar_eq(det,0,delta)){
		return [((b2 * c1) - (b1 * c2)) / det, ((a1 * c2) - (a2 * c1)) / det];
	} else {
		return [0,0];
    }
}

/**
 * Quickly decompose the Polygon into convex sub-polygons.
 * @method quickDecomp
 * @param  {Array} result
 * @param  {Array} [reflexVertices]
 * @param  {Array} [steinerPoints]
 * @param  {Number} [delta]
 * @param  {Number} [maxlevel]
 * @param  {Number} [level]
 * @return {Array}
 */
function polygonQuickDecomp(polygon, result,reflexVertices,steinerPoints,delta,maxlevel,level){
    maxlevel = maxlevel || 100;
    level = level || 0;
    delta = delta || 25;
    result = typeof(result)!=="undefined" ? result : [];
    reflexVertices = reflexVertices || [];
    steinerPoints = steinerPoints || [];

    var upperInt=[0,0], lowerInt=[0,0], p=[0,0]; // Points
    var upperDist=0, lowerDist=0, d=0, closestDist=0; // scalars
    var upperIndex=0, lowerIndex=0, closestIndex=0; // Integers
    var lowerPoly=[], upperPoly=[]; // polygons
    var poly = polygon,
        v = polygon;

    if(v.length < 3){
		return result;
    }

    level++;
    if(level > maxlevel){
        console.warn("quickDecomp: max level ("+maxlevel+") reached.");
        return result;
    }

    for (var i = 0; i < polygon.length; ++i) {
        if (polygonIsReflex(poly, i)) {
            reflexVertices.push(poly[i]);
            upperDist = lowerDist = Number.MAX_VALUE;


            for (var j = 0; j < polygon.length; ++j) {
                if (isLeft(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j)) && isRightOn(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j - 1))) { // if line intersects with an edge
                    p = getIntersectionPoint(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j), polygonAt(poly, j - 1)); // find the point of intersection
                    if (isRight(polygonAt(poly, i + 1), polygonAt(poly, i), p)) { // make sure it's inside the poly
                        d = sqdist(poly[i], p);
                        if (d < lowerDist) { // keep only the closest intersection
                            lowerDist = d;
                            lowerInt = p;
                            lowerIndex = j;
                        }
                    }
                }
                if (isLeft(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j + 1)) && isRightOn(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j))) {
                    p = getIntersectionPoint(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j), polygonAt(poly, j + 1));
                    if (isLeft(polygonAt(poly, i - 1), polygonAt(poly, i), p)) {
                        d = sqdist(poly[i], p);
                        if (d < upperDist) {
                            upperDist = d;
                            upperInt = p;
                            upperIndex = j;
                        }
                    }
                }
            }

            // if there are no vertices to connect to, choose a point in the middle
            if (lowerIndex === (upperIndex + 1) % polygon.length) {
                //console.log("Case 1: Vertex("+i+"), lowerIndex("+lowerIndex+"), upperIndex("+upperIndex+"), poly.size("+polygon.length+")");
                p[0] = (lowerInt[0] + upperInt[0]) / 2;
                p[1] = (lowerInt[1] + upperInt[1]) / 2;
                steinerPoints.push(p);

                if (i < upperIndex) {
                    //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.begin() + upperIndex + 1);
                    polygonAppend(lowerPoly, poly, i, upperIndex+1);
                    lowerPoly.push(p);
                    upperPoly.push(p);
                    if (lowerIndex !== 0){
                        //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.end());
                        polygonAppend(upperPoly, poly,lowerIndex,poly.length);
                    }
                    //upperPoly.insert(upperPoly.end(), poly.begin(), poly.begin() + i + 1);
                    polygonAppend(upperPoly, poly,0,i+1);
                } else {
                    if (i !== 0){
                        //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.end());
                        polygonAppend(lowerPoly, poly,i,poly.length);
                    }
                    //lowerPoly.insert(lowerPoly.end(), poly.begin(), poly.begin() + upperIndex + 1);
                    polygonAppend(lowerPoly, poly,0,upperIndex+1);
                    lowerPoly.push(p);
                    upperPoly.push(p);
                    //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.begin() + i + 1);
                    polygonAppend(upperPoly, poly,lowerIndex,i+1);
                }
            } else {
                // connect to the closest point within the triangle
                //console.log("Case 2: Vertex("+i+"), closestIndex("+closestIndex+"), poly.size("+polygon.length+")\n");

                if (lowerIndex > upperIndex) {
                    upperIndex += polygon.length;
                }
                closestDist = Number.MAX_VALUE;

                if(upperIndex < lowerIndex){
                    return result;
                }

                for (var j = lowerIndex; j <= upperIndex; ++j) {
                    if (
                        isLeftOn(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j)) &&
                        isRightOn(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j))
                    ) {
                        d = sqdist(polygonAt(poly, i), polygonAt(poly, j));
                        if (d < closestDist && polygonCanSee2(poly, i, j)) {
                            closestDist = d;
                            closestIndex = j % polygon.length;
                        }
                    }
                }

                if (i < closestIndex) {
                    polygonAppend(lowerPoly, poly,i,closestIndex+1);
                    if (closestIndex !== 0){
                        polygonAppend(upperPoly, poly,closestIndex,v.length);
                    }
                    polygonAppend(upperPoly, poly,0,i+1);
                } else {
                    if (i !== 0){
                        polygonAppend(lowerPoly, poly,i,v.length);
                    }
                    polygonAppend(lowerPoly, poly,0,closestIndex+1);
                    polygonAppend(upperPoly, poly,closestIndex,i+1);
                }
            }

            // solve smallest poly first
            if (lowerPoly.length < upperPoly.length) {
                polygonQuickDecomp(lowerPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
                polygonQuickDecomp(upperPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
            } else {
                polygonQuickDecomp(upperPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
                polygonQuickDecomp(lowerPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
            }

            return result;
        }
    }
    result.push(polygon);

    return result;
}

/**
 * Remove collinear points in the polygon.
 * @method removeCollinearPoints
 * @param  {Number} [precision] The threshold angle to use when determining whether two edges are collinear. Use zero for finest precision.
 * @return {Number}           The number of points removed
 */
function polygonRemoveCollinearPoints(polygon, precision){
    var num = 0;
    for(var i=polygon.length-1; polygon.length>3 && i>=0; --i){
        if(collinear(polygonAt(polygon, i-1),polygonAt(polygon, i),polygonAt(polygon, i+1),precision)){
            // Remove the middle point
            polygon.splice(i%polygon.length,1);
            num++;
        }
    }
    return num;
}

/**
 * Remove duplicate points in the polygon.
 * @method removeDuplicatePoints
 * @param  {Number} [precision] The threshold to use when determining whether two points are the same. Use zero for best precision.
 */
function polygonRemoveDuplicatePoints(polygon, precision){
    for(var i=polygon.length-1; i>=1; --i){
        var pi = polygon[i];
        for(var j=i-1; j>=0; --j){
            if(points_eq(pi, polygon[j], precision)){
                polygon.splice(i,1);
                continue;
            }
        }
    }
}

/**
 * Check if two scalars are equal
 * @static
 * @method eq
 * @param  {Number} a
 * @param  {Number} b
 * @param  {Number} [precision]
 * @return {Boolean}
 */
function scalar_eq(a,b,precision){
    precision = precision || 0;
    return Math.abs(a-b) <= precision;
}

/**
 * Check if two points are equal
 * @static
 * @method points_eq
 * @param  {Array} a
 * @param  {Array} b
 * @param  {Number} [precision]
 * @return {Boolean}
 */
function points_eq(a,b,precision){
    return scalar_eq(a[0],b[0],precision) && scalar_eq(a[1],b[1],precision);
}


/***/ }),

/***/ 99:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*
 * A fast javascript implementation of simplex noise by Jonas Wagner

Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
Better rank ordering method by Stefan Gustavson in 2012.

 Copyright (c) 2022 Jonas Wagner

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildPermutationTable = exports.createNoise4D = exports.createNoise3D = exports.createNoise2D = void 0;
// these #__PURE__ comments help uglifyjs with dead code removal
// 
const F2 = /*#__PURE__*/ 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = /*#__PURE__*/ (3.0 - Math.sqrt(3.0)) / 6.0;
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;
const F4 = /*#__PURE__*/ (Math.sqrt(5.0) - 1.0) / 4.0;
const G4 = /*#__PURE__*/ (5.0 - Math.sqrt(5.0)) / 20.0;
// I'm really not sure why this | 0 (basically a coercion to int)
// is making this faster but I get ~5 million ops/sec more on the
// benchmarks across the board or a ~10% speedup.
const fastFloor = (x) => Math.floor(x) | 0;
const grad2 = /*#__PURE__*/ new Float64Array([1, 1,
    -1, 1,
    1, -1,
    -1, -1,
    1, 0,
    -1, 0,
    1, 0,
    -1, 0,
    0, 1,
    0, -1,
    0, 1,
    0, -1]);
// double seems to be faster than single or int's
// probably because most operations are in double precision
const grad3 = /*#__PURE__*/ new Float64Array([1, 1, 0,
    -1, 1, 0,
    1, -1, 0,
    -1, -1, 0,
    1, 0, 1,
    -1, 0, 1,
    1, 0, -1,
    -1, 0, -1,
    0, 1, 1,
    0, -1, 1,
    0, 1, -1,
    0, -1, -1]);
// double is a bit quicker here as well
const grad4 = /*#__PURE__*/ new Float64Array([0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1,
    0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
    1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1,
    -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
    1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1,
    -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
    1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0,
    -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0]);
/**
 * Creates a 2D noise function
 * @param random the random function that will be used to build the permutation table
 * @returns {NoiseFunction2D}
 */
function createNoise2D(random = Math.random) {
    const perm = buildPermutationTable(random);
    // precalculating this yields a little ~3% performance improvement.
    const permGrad2x = new Float64Array(perm).map(v => grad2[(v % 12) * 2]);
    const permGrad2y = new Float64Array(perm).map(v => grad2[(v % 12) * 2 + 1]);
    return function noise2D(x, y) {
        // if(!isFinite(x) || !isFinite(y)) return 0;
        let n0 = 0; // Noise contributions from the three corners
        let n1 = 0;
        let n2 = 0;
        // Skew the input space to determine which simplex cell we're in
        const s = (x + y) * F2; // Hairy factor for 2D
        const i = fastFloor(x + s);
        const j = fastFloor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t; // Unskew the cell origin back to (x,y) space
        const Y0 = j - t;
        const x0 = x - X0; // The x,y distances from the cell origin
        const y0 = y - Y0;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else {
            i1 = 0;
            j1 = 1;
        } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        const y2 = y0 - 1.0 + 2.0 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        const ii = i & 255;
        const jj = j & 255;
        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            const gi0 = ii + perm[jj];
            const g0x = permGrad2x[gi0];
            const g0y = permGrad2y[gi0];
            t0 *= t0;
            // n0 = t0 * t0 * (grad2[gi0] * x0 + grad2[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
            n0 = t0 * t0 * (g0x * x0 + g0y * y0);
        }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            const gi1 = ii + i1 + perm[jj + j1];
            const g1x = permGrad2x[gi1];
            const g1y = permGrad2y[gi1];
            t1 *= t1;
            // n1 = t1 * t1 * (grad2[gi1] * x1 + grad2[gi1 + 1] * y1);
            n1 = t1 * t1 * (g1x * x1 + g1y * y1);
        }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            const gi2 = ii + 1 + perm[jj + 1];
            const g2x = permGrad2x[gi2];
            const g2y = permGrad2y[gi2];
            t2 *= t2;
            // n2 = t2 * t2 * (grad2[gi2] * x2 + grad2[gi2 + 1] * y2);
            n2 = t2 * t2 * (g2x * x2 + g2y * y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    };
}
exports.createNoise2D = createNoise2D;
/**
 * Creates a 3D noise function
 * @param random the random function that will be used to build the permutation table
 * @returns {NoiseFunction3D}
 */
function createNoise3D(random = Math.random) {
    const perm = buildPermutationTable(random);
    // precalculating these seems to yield a speedup of over 15%
    const permGrad3x = new Float64Array(perm).map(v => grad3[(v % 12) * 3]);
    const permGrad3y = new Float64Array(perm).map(v => grad3[(v % 12) * 3 + 1]);
    const permGrad3z = new Float64Array(perm).map(v => grad3[(v % 12) * 3 + 2]);
    return function noise3D(x, y, z) {
        let n0, n1, n2, n3; // Noise contributions from the four corners
        // Skew the input space to determine which simplex cell we're in
        const s = (x + y + z) * F3; // Very nice and simple skew factor for 3D
        const i = fastFloor(x + s);
        const j = fastFloor(y + s);
        const k = fastFloor(z + s);
        const t = (i + j + k) * G3;
        const X0 = i - t; // Unskew the cell origin back to (x,y,z) space
        const Y0 = j - t;
        const Z0 = k - t;
        const x0 = x - X0; // The x,y,z distances from the cell origin
        const y0 = y - Y0;
        const z0 = z - Z0;
        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        let i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        let i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // X Y Z order
            else if (x0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // X Z Y order
            else {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // Z X Y order
        }
        else { // x0<y0
            if (y0 < z0) {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Z Y X order
            else if (x0 < z0) {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Y Z X order
            else {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // Y X Z order
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        const x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
        const y1 = y0 - j1 + G3;
        const z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
        const y2 = y0 - j2 + 2.0 * G3;
        const z2 = z0 - k2 + 2.0 * G3;
        const x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
        const y3 = y0 - 1.0 + 3.0 * G3;
        const z3 = z0 - 1.0 + 3.0 * G3;
        // Work out the hashed gradient indices of the four simplex corners
        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;
        // Calculate the contribution from the four corners
        let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0)
            n0 = 0.0;
        else {
            const gi0 = ii + perm[jj + perm[kk]];
            t0 *= t0;
            n0 = t0 * t0 * (permGrad3x[gi0] * x0 + permGrad3y[gi0] * y0 + permGrad3z[gi0] * z0);
        }
        let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0)
            n1 = 0.0;
        else {
            const gi1 = ii + i1 + perm[jj + j1 + perm[kk + k1]];
            t1 *= t1;
            n1 = t1 * t1 * (permGrad3x[gi1] * x1 + permGrad3y[gi1] * y1 + permGrad3z[gi1] * z1);
        }
        let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0)
            n2 = 0.0;
        else {
            const gi2 = ii + i2 + perm[jj + j2 + perm[kk + k2]];
            t2 *= t2;
            n2 = t2 * t2 * (permGrad3x[gi2] * x2 + permGrad3y[gi2] * y2 + permGrad3z[gi2] * z2);
        }
        let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0)
            n3 = 0.0;
        else {
            const gi3 = ii + 1 + perm[jj + 1 + perm[kk + 1]];
            t3 *= t3;
            n3 = t3 * t3 * (permGrad3x[gi3] * x3 + permGrad3y[gi3] * y3 + permGrad3z[gi3] * z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to stay just inside [-1,1]
        return 32.0 * (n0 + n1 + n2 + n3);
    };
}
exports.createNoise3D = createNoise3D;
/**
 * Creates a 4D noise function
 * @param random the random function that will be used to build the permutation table
 * @returns {NoiseFunction4D}
 */
function createNoise4D(random = Math.random) {
    const perm = buildPermutationTable(random);
    // precalculating these leads to a ~10% speedup
    const permGrad4x = new Float64Array(perm).map(v => grad4[(v % 32) * 4]);
    const permGrad4y = new Float64Array(perm).map(v => grad4[(v % 32) * 4 + 1]);
    const permGrad4z = new Float64Array(perm).map(v => grad4[(v % 32) * 4 + 2]);
    const permGrad4w = new Float64Array(perm).map(v => grad4[(v % 32) * 4 + 3]);
    return function noise4D(x, y, z, w) {
        let n0, n1, n2, n3, n4; // Noise contributions from the five corners
        // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
        const s = (x + y + z + w) * F4; // Factor for 4D skewing
        const i = fastFloor(x + s);
        const j = fastFloor(y + s);
        const k = fastFloor(z + s);
        const l = fastFloor(w + s);
        const t = (i + j + k + l) * G4; // Factor for 4D unskewing
        const X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
        const Y0 = j - t;
        const Z0 = k - t;
        const W0 = l - t;
        const x0 = x - X0; // The x,y,z,w distances from the cell origin
        const y0 = y - Y0;
        const z0 = z - Z0;
        const w0 = w - W0;
        // For the 4D case, the simplex is a 4D shape I won't even try to describe.
        // To find out which of the 24 possible simplices we're in, we need to
        // determine the magnitude ordering of x0, y0, z0 and w0.
        // Six pair-wise comparisons are performed between each possible pair
        // of the four coordinates, and the results are used to rank the numbers.
        let rankx = 0;
        let ranky = 0;
        let rankz = 0;
        let rankw = 0;
        if (x0 > y0)
            rankx++;
        else
            ranky++;
        if (x0 > z0)
            rankx++;
        else
            rankz++;
        if (x0 > w0)
            rankx++;
        else
            rankw++;
        if (y0 > z0)
            ranky++;
        else
            rankz++;
        if (y0 > w0)
            ranky++;
        else
            rankw++;
        if (z0 > w0)
            rankz++;
        else
            rankw++;
        // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
        // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
        // impossible. Only the 24 indices which have non-zero entries make any sense.
        // We use a thresholding to set the coordinates in turn from the largest magnitude.
        // Rank 3 denotes the largest coordinate.
        // Rank 2 denotes the second largest coordinate.
        // Rank 1 denotes the second smallest coordinate.
        // The integer offsets for the second simplex corner
        const i1 = rankx >= 3 ? 1 : 0;
        const j1 = ranky >= 3 ? 1 : 0;
        const k1 = rankz >= 3 ? 1 : 0;
        const l1 = rankw >= 3 ? 1 : 0;
        // The integer offsets for the third simplex corner
        const i2 = rankx >= 2 ? 1 : 0;
        const j2 = ranky >= 2 ? 1 : 0;
        const k2 = rankz >= 2 ? 1 : 0;
        const l2 = rankw >= 2 ? 1 : 0;
        // The integer offsets for the fourth simplex corner
        const i3 = rankx >= 1 ? 1 : 0;
        const j3 = ranky >= 1 ? 1 : 0;
        const k3 = rankz >= 1 ? 1 : 0;
        const l3 = rankw >= 1 ? 1 : 0;
        // The fifth corner has all coordinate offsets = 1, so no need to compute that.
        const x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
        const y1 = y0 - j1 + G4;
        const z1 = z0 - k1 + G4;
        const w1 = w0 - l1 + G4;
        const x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
        const y2 = y0 - j2 + 2.0 * G4;
        const z2 = z0 - k2 + 2.0 * G4;
        const w2 = w0 - l2 + 2.0 * G4;
        const x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
        const y3 = y0 - j3 + 3.0 * G4;
        const z3 = z0 - k3 + 3.0 * G4;
        const w3 = w0 - l3 + 3.0 * G4;
        const x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
        const y4 = y0 - 1.0 + 4.0 * G4;
        const z4 = z0 - 1.0 + 4.0 * G4;
        const w4 = w0 - 1.0 + 4.0 * G4;
        // Work out the hashed gradient indices of the five simplex corners
        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;
        const ll = l & 255;
        // Calculate the contribution from the five corners
        let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
        if (t0 < 0)
            n0 = 0.0;
        else {
            const gi0 = ii + perm[jj + perm[kk + perm[ll]]];
            t0 *= t0;
            n0 = t0 * t0 * (permGrad4x[gi0] * x0 + permGrad4y[gi0] * y0 + permGrad4z[gi0] * z0 + permGrad4w[gi0] * w0);
        }
        let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
        if (t1 < 0)
            n1 = 0.0;
        else {
            const gi1 = ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]];
            t1 *= t1;
            n1 = t1 * t1 * (permGrad4x[gi1] * x1 + permGrad4y[gi1] * y1 + permGrad4z[gi1] * z1 + permGrad4w[gi1] * w1);
        }
        let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
        if (t2 < 0)
            n2 = 0.0;
        else {
            const gi2 = ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]];
            t2 *= t2;
            n2 = t2 * t2 * (permGrad4x[gi2] * x2 + permGrad4y[gi2] * y2 + permGrad4z[gi2] * z2 + permGrad4w[gi2] * w2);
        }
        let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
        if (t3 < 0)
            n3 = 0.0;
        else {
            const gi3 = ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]];
            t3 *= t3;
            n3 = t3 * t3 * (permGrad4x[gi3] * x3 + permGrad4y[gi3] * y3 + permGrad4z[gi3] * z3 + permGrad4w[gi3] * w3);
        }
        let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
        if (t4 < 0)
            n4 = 0.0;
        else {
            const gi4 = ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]];
            t4 *= t4;
            n4 = t4 * t4 * (permGrad4x[gi4] * x4 + permGrad4y[gi4] * y4 + permGrad4z[gi4] * z4 + permGrad4w[gi4] * w4);
        }
        // Sum up and scale the result to cover the range [-1,1]
        return 27.0 * (n0 + n1 + n2 + n3 + n4);
    };
}
exports.createNoise4D = createNoise4D;
/**
 * Builds a random permutation table.
 * This is exported only for (internal) testing purposes.
 * Do not rely on this export.
 * @private
 */
function buildPermutationTable(random) {
    const tableSize = 512;
    const p = new Uint8Array(tableSize);
    for (let i = 0; i < tableSize / 2; i++) {
        p[i] = i;
    }
    for (let i = 0; i < tableSize / 2 - 1; i++) {
        const r = i + ~~(random() * (256 - i));
        const aux = p[i];
        p[i] = p[r];
        p[r] = aux;
    }
    for (let i = 256; i < tableSize; i++) {
        p[i] = p[i - 256];
    }
    return p;
}
exports.buildPermutationTable = buildPermutationTable;
//# sourceMappingURL=simplex-noise.js.map

/***/ }),

/***/ 985:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

const Common = __webpack_require__(929);

/**
	 * A behavior tree can be used to express complex logic and decision making. It's especially useful for game AI. See [here](https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work) to learn more about behavior trees.
	 * Ter.js's behavior tree has several built in types:
	 * 
	 * ## Composites
	 * Composites can have multiple children, defined in the `children` array.
	 * 
	 * ### Selector
	 * A selector is a composite that executes its children until the first success. Once this happens, it returns a success. If none of its children succeed, it fails.
	 * It is essentially a logical OR statement.
	 * 
	 * ### Sequence
	 * A sequence is a composite that executes all its children until the first failure. If all its children succeed, it succeeds. If any of its children fail, it fails.
	 * It is like a logical AND statement.
	 * 
	 * ## Decorators
	 * Decorators have **only one** child. They modify the output of their child in some way, such as always failing or repeating.
	 * 
	 * ### Inverter
	 * Inverts the output of its child. If its child succeeds, it fails. If its child fails, it succeeds.
	 * 
	 * ### Succeeder
	 * Always succeeds, no matter what its child's output is.
	 * 
	 * ### Repeat
	 * Always repeats a set number of times, specified by the `count` option. It succeeds when it finishes running and can never fail.
	 * 
	 * ### RepeatUntilFail
	 * Repeats until its child fails. The maximum number of times it can repeat is specified by the `count` option (same as Repeat) and is `Infinity` by default. It either succeeds once it runs `count` times or succeeds when any of its children fail. Like Repeat, RepeatUntilFail never resolves to failure.
	 * 
	 * ## Leaf
	 * The leaf node is where the logic of the tree goes. It has a `callback` with `resolve` and `blackboard` parameters. Call `resolve(BehaviorTree.SUCCESS)` to indicate the leaf finished successfully, or `resolve(BehaviorTree.FAILURE)` to tell the tree the leaf failed. 
	 * The blackboard is an object that is shared across all nodes that can be used as memory for the AI agent.
	 * 
	 * ## Reusing trees
	 * You can reuse trees or parts of trees by registering them. To do that, use `BehaviorTree.registerTree(name, tree)`:
	 * ```
	 * BehaviorTree.registerTree("isAlive", {
	 * 	type: "Leaf",
	 * 	callback: (resolve, blackboard) => {
	 * 		let { health } = blackboard;
	 * 		let alive = health > 0 && !body.removed;
	 * 		if (alive) {
	 * 			resolve(BehaviorTree.SUCCESS);
	 * 		}
	 * 		else {
	 * 			resolve(BehaviorTree.FAILURE);
	 * 		}
	 * 	}
	 * 
	 * });
	 * ```
	 * This would create a behavior tree that might check if the agent is alive. To use this tree, simply add its name as a string:
	 * ```
	 * let agentBehavior = new BehaviorTree({
	 * 	type: "Sequence",
	 * 	children: [
	 * 		"isAlive", // <--- Registered tree is used here
	 * 		{
	 *	 		type: "Leaf",
	 *	 		callback: (resolve, blackboard) => {
	 * 				// logic goes here
	 *	 		}
	 * 		},
	 * 	]
	 * });
	 * ```
	 * This will insert the `isAlive` tree into the new tree created. In this case, it would check if the agent is alive, then do some other task if it is.
 */
class BehaviorTree {
	static FAILURE = 0;
	static SUCCESS = 1;
	// RUNNING state not necessary in this implementation
	static globalTrees = {};
	static call(name, resolve, blackboard = {}) {
		let tree = this.globalTrees[name];
		if (!tree) {
			throw new Error(`No registered tree of name: ${ name }`);
		}
		tree.tick(blackboard).then(result => resolve(result));
	}
	static nodes = {};
	static parse(node) {
		let nodeType;
		if (typeof node == "string") {
			if (!BehaviorTree.globalTrees[node]) {
				throw new Error("No registered tree of name: " + node);
			}
			node = BehaviorTree.globalTrees[node];
		}
		let tmp = {};
		Common.merge(tmp, node);
		node = tmp;

		nodeType = BehaviorTree.nodes[node.type ?? node.toString()];
		if (!nodeType) {
			throw new Error("No node of type: " + node.type + ", " + node);
		}
		
		if (node.child) {
			node.child = BehaviorTree.parse(node.child);
		}
		if (node.children) {
			for (let i = 0; i < node.children.length; ++i) {
				node.children[i] = BehaviorTree.parse(node.children[i]);
			}
		}
		
		let nodeObject = new nodeType(node, node?.blackboard);
		return nodeObject;
	}
	static registerType(_class) {
		this.nodes[_class] = _class;
	}
	static registerTree(name, tree) {
		this.globalTrees[name] = tree;
	}
	static toString() {
		return "BehaviorTree";
	}
	static id = -1;
	blackboard = {};
	head = null;

	/**
	 * @param {Object} tree - Object to create tree from *or* string of registered tree
	 * @param {Object} [blackboard = {}] - Blackboard that is shared between all nodes
	 * @example
	 * let behaviors = new BehaviorTree({
	 * 	type: "Selector",
	 * 	children: [
	 * 		{
	 *	 		type: "RepeatUntilFail",
	 *			count: 3,
	 *	 		child: {
	 * 				type: "Leaf",
	 *	 			callback: (resolve, blackboard) => {
	 *	 				// logic goes here
	 *	 			}
	 *	 		}
	 * 		},
	 * 		{
	 *	 		type: "Leaf",
	 *	 		callback: (resolve, blackboard) => {
	 *	 			// logic goes here
	 *	 		}
	 * 		}
	 * 	]
	 * });
	 */
	constructor(tree, blackboard = {}) {
		this.id = ++BehaviorTree.id;
		this.toString = BehaviorTree.toString;

		// Create blackboard
		this.blackboard = blackboard;

		if ((tree.type ?? tree.toString()) === "BehaviorTree") {
			this.blackboard = tree.blackboard;
			this.head = BehaviorTree.parse(tree.head);
		}
		else {
			// parse tree
			this.head = BehaviorTree.parse(tree);
		}
	}
	/**
	 * Executes the behavior tree.
	 * @param {object} blackboard - Optionally overrides tree's blackboard. Should generally be left blank. 
	 * @returns {Promise} - Promise that resolve to either `BehaviorTree.SUCCESS` or `BehaviorTree.FAILURE` once all children finish processing. 
	 * @example
	 * // This starts the tick
	 * tree.tick();
	 * 
	 * // This starts the tick with a function that executes once the tick completes
	 * tree.tick().then(result => {
	 * 	if (result == BehaviorTree.SUCCESS) {
	 * 		// Do something
	 * 	}
	 * 	else if (result == BehaviorTree.FAILURE) {
	 * 		// Do something else, maybe throw an error
	 * 	}
	 * });
	 */
	tick(blackboard = this.blackboard) {
		if (!this.head) {
			console.error(this);
			throw new Error("Could not tick behavior tree: No head node");
		}

		return this.head.tick(blackboard);
	}
	/**
	 * Stops the behavior tree while it's running. Useful if you want to reevaluate the tree because of an external state change or stop it entirely.
	 * @param {BehaviorTree.SUCCESS|BehaviorTree.FAILURE} value - What nodes should resolve to in the tree. Usually doesn't change the output.
	 * @example
	 * // If the tree is in the middle of a tick, it will instantly resolve to BehaviorTree.FAILURE`
	 * tree.interrupt();
	 * 
	 * // This one will resolve to SUCCESS. Useful if you have a callback that depends on the result of the tick
	 * tree.interrupt(BehaviorTree.SUCCESS);
	 */
	interrupt(value = BehaviorTree.FAILURE) {
		if (!this.head) {
			console.error(this);
			throw new Error("Coudl not interrupt behavior tree: tree has no head node");
		}
		this.head.interrupt(value);
	}
}

//
// Composites
//
class Composite { // Has 1+ children, processes them in a certain order each tick
	static toString() {
		return "Composite";
	}

	/**
	 * @type {Function|undefined}
	 * @protected
	 */
	resolve;
	curTick = 0;
	interruptTick = -1;

	constructor({ children = [] }) {
		this.id = ++BehaviorTree.id;
		this.children = children;
		this.toString = Composite.toString;
	}
	interrupt(value = BehaviorTree.FAILURE) {
		for (let child of this.children) {
			child.interrupt(value);
		}
		if (this.resolve) {
			this.interruptTick = this.curTick++;
			this.resolve(value);
		}
	}
}

class Selector extends Composite { // OR, returns success at first success / running, failure if all children fail
	static toString() {
		return "Selector";
	}

	constructor(options) {
		super(options);
		this.toString = Selector.toString;
	}
	tick(blackboard) {
		let node = this;
		let children = this.children;
		return new Promise((resolve, reject) => {
			this.resolve = resolve;
			let i = 0;
			let curTick = this.curTick++;
			function next() {
				children[i].tick(blackboard).then(result => {
					if (node.interruptTick >= curTick) {
						return;
					}
					if (result == BehaviorTree.SUCCESS) {
						resolve(result);
					}
					else {
						if (++i >= children.length) {
							resolve(BehaviorTree.FAILURE);
						}
						else {
							next();
						}
					}
				});
			}
			next();
		});
	}
}

class Sequence extends Composite { // AND, returns failure at first failure, success if no children fail
	static toString() {
		return "Sequence";
	}

	constructor(options) {
		super(options);
		this.toString = Sequence.toString;
	}
	tick(blackboard) {
		let children = this.children;
		let node = this;
		return new Promise(resolve => {
			this.resolve = resolve;
			let i = 0;
			let curTick = this.curTick++;
			function next() {
				children[i].tick(blackboard).then(result => {
					if (node.interruptTick >= curTick) {
						return;
					}
					if (result == BehaviorTree.SUCCESS) {
						if (++i >= children.length) {
							resolve(BehaviorTree.SUCCESS);
						}
						else {
							next();
						}
					}
					else {
						resolve(result);
					}
				});
			}
			next();
		});
	}
}

//
// Decorators
//
class Decorator { // Has 1 child, transforms result / repeats / terminates
	static toString() {
		return "Decorator";
	}

	/**
	 * @type {Function|undefined}
	 * @protected
	 */
	resolve;
	curTick = 0;
	interruptTick = -1;

	constructor({ child }) {
		this.id = ++BehaviorTree.id;
		this.child = child;
		this.toString = Decorator.toString;
	}
	interrupt(value = BehaviorTree.FAILURE) {
		this.child.interrupt(value);
		
		if (this.resolve) {
			this.resolve(value);
			this.interruptTick = this.curTick++;
		}
	}
}

class Inverter extends Decorator { // Inverts result, SUCCESS -> FAILURE, FAILURE -> SUCCESS
	static toString() {
		return "Inverter";
	}

	constructor(options) {
		super(options);
		this.toString = Inverter.toString;
	}
	tick(blackboard) {
		let node = this;
		let curTick = this.curTick++;
		return new Promise(resolve => {
			if (node.interruptTick >= curTick) {
				return;
			}
			this.resolve = resolve;
			this.child.tick(blackboard).then(result => {
				resolve(Number(!result));
			});
		});
	}
}

class Repeat extends Decorator { // Repeats child `count` times
	static toString() {
		return "Repeat";
	}

	count = 3;
	constructor(options) {
		super(options);
		this.toString = Repeat.toString;
		this.count = options.count ?? 3;
	}
	tick(blackboard) {
		let node = this;
		let curCount = 0;
		let maxCount = this.count;
		let child = this.child;
		let curTick = this.curTick++;
		return new Promise(resolve => {
			this.resolve = resolve;
			function next() {
				child.tick(blackboard).then(result => {
					if (node.interruptTick >= curTick) {
						return;
					}
					if (++curCount >= maxCount) {
						resolve(BehaviorTree.SUCCESS);
					}
					else {
						next();
					}
				});
			}
			next();
		});
	}
}

class RepeatUntilFail extends Decorator { // Repeats child `count` times (default is Infinity), or until a child returns FAILURE; always returns SUCCESS
	static toString() {
		return "RepeatUntilFail";
	}
	count = Infinity;
	constructor(options) {
		super(options);
		this.toString = RepeatUntilFail.toString;
		this.count = options.count ?? Infinity;
	}
	tick(blackboard) {
		let curCount = 0;
		let maxCount = this.count;
		let child = this.child;
		let node = this;
		let curTick = this.curTick++;
		return new Promise(resolve => {
			this.resolve = resolve;
			function next() {
				child.tick(blackboard).then(result => {
					if (node.interruptTick >= curTick) {
						return;
					}
					if (result == BehaviorTree.FAILURE) {
						resolve(BehaviorTree.SUCCESS);
					}
					else if (++curCount >= maxCount) {
						resolve(BehaviorTree.SUCCESS);
					}
					else {
						next();
					}
				});
			}
			next();
		});
	}
}

class Succeeder extends Decorator { // Always returns SUCCESS
	static toString() {
		return "Succeeder";
	}

	constructor(options) {
		super(options);
		this.toString = Succeeder.toString;
	}
	tick(blackboard) {
		let child = this.child;
		let node = this;
		let curTick = this.curTick++;
		return new Promise(resolve => {
			this.resolve = resolve;
			child.tick(blackboard).then(result => {
				if (node.interruptTick >= curTick) {
					return;
				}
				resolve(BehaviorTree.SUCCESS);
			});
		});
	}
}


//
// Leafs
//
class Leaf { // Logic of the tree; calls `callback` every tick, which is the actual tree code
	static toString() {
		return "Leaf";
	}
	constructor({ callback }) {
		this.id = ++BehaviorTree.id;
		this.callback = callback;
		this.toString = Leaf.toString;
	}
	tick(blackboard) {
		return new Promise(resolve => {
			this.resolve = resolve;
			this.callback(resolve, blackboard);
		});
	}
	interrupt(value = BehaviorTree.FAILURE) {
		if (this.resolve) {
			this.resolve(value);
		}
	}
}

BehaviorTree.registerType(BehaviorTree);
BehaviorTree.registerType(Composite);
BehaviorTree.registerType(Selector);
BehaviorTree.registerType(Sequence);
BehaviorTree.registerType(Decorator);
BehaviorTree.registerType(Inverter);
BehaviorTree.registerType(Repeat);
BehaviorTree.registerType(RepeatUntilFail);
BehaviorTree.registerType(Succeeder);
BehaviorTree.registerType(Leaf);
module.exports = {
	BehaviorTree: BehaviorTree,
	Leaf: Leaf,

	Composite: Composite,
	Selector: Selector,
	Sequence: Sequence,

	Decorator: Decorator,
	Inverter: Inverter,
	Repeat: Repeat,
	RepeatUntilFail: RepeatUntilFail,
	Succeeder: Succeeder,

}


/***/ }),

/***/ 789:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RigidBody = __webpack_require__(301);

const Bodies = module.exports;

Bodies.RigidBody = __webpack_require__(301);
Bodies.Rectangle = __webpack_require__(396);
Bodies.Circle = __webpack_require__(353);
Bodies.RegularPolygon = __webpack_require__(27);
Bodies.Polygon = __webpack_require__(551);

Bodies.createBodyFactory = function(Engine) {
	let factory = {};
	for (let type in Bodies) {
		if (type === "RigidBody") continue;
		if (Bodies[type].prototype instanceof RigidBody || Bodies[type] === RigidBody) {
			factory[type] = function(...args) {
				return new Bodies[type](Engine, ...args);
			}
		}
	}
	return factory;
}


/***/ }),

/***/ 353:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RigidBody = __webpack_require__(301);
const vec = __webpack_require__(811);
const PolygonRender = __webpack_require__(219);
const Sprite = __webpack_require__(416);

/**
 * A Circle RigidBody
 * @extends RigidBody
 */
class Circle extends RigidBody {
	static createVertices(radius, verticeCount = 0) {
		verticeCount = verticeCount || Math.round(Math.pow(radius, 1/3) * 2.8);
		let angle = Math.PI * 2 / verticeCount;
		let vertices = [];
		for (let i = 0; i < verticeCount; i++) {
			vertices.push(new vec(Math.cos(angle * i + angle / 2) * radius, Math.sin(angle * i + angle / 2) * radius));
		}
		return vertices;
	}

	/**
	 * 
	 * @param {Engine} Engine - Engine to add to
	 * @param {number} radius - Radius of Circle
	 * @param {vec} position - Position of body
	 * @param {object} options - (RigidBody)[./RigidBody.html] options
	 * @param {number} [options.verticeCount] - Number of vertices in the circle
	 */
	constructor(Engine, radius, position, options = {}) {
		super(Engine, Circle.createVertices(radius, options.verticeCount), position, options);

		this.radius = radius;
		this.nodeType = "Circle";
	}
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "Circle",
			radius: this.radius,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			width:  this.radius * 2,
			height: this.radius * 2,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);

		return this;
	}
}
module.exports = Circle;


/***/ }),

/***/ 551:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RigidBody = __webpack_require__(301);
const vec = __webpack_require__(811);
const PolygonRender = __webpack_require__(219);
const Sprite = __webpack_require__(416);

/**
 * A Polygon RigidBody
 * @extends RigidBody
 */
class Polygon extends RigidBody {
	static createVertices(radius, verticeCount = 0) {
		verticeCount = verticeCount || Math.round(Math.pow(radius, 1/3) * 2.8);
		let angle = Math.PI * 2 / verticeCount;
		let vertices = [];
		for (let i = 0; i < verticeCount; i++) {
			vertices.push(new vec(Math.cos(angle * i + angle / 2) * radius, Math.sin(angle * i + angle / 2) * radius));
		}
		return vertices;
	}
	
	/**
	 * 
	 * @param {Engine} Engine - Engine to add to
	 * @param {Array<vec>} vertices - Vertices of polygon
	 * @param {vec} position - Position of body
	 * @param {object} options - (RigidBody)[./RigidBody.html] options
	 */
	constructor(Engine, vertices, position, options = {}) {
		super(Engine, vertices, position, options);

		this.nodeType = "Polygon";
	}
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "Polygon",
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);

		return this;
	}
}
module.exports = Polygon;


/***/ }),

/***/ 396:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RigidBody = __webpack_require__(301);
const vec = __webpack_require__(811);
const PolygonRender = __webpack_require__(219);
const Sprite = __webpack_require__(416);

/**
 * A rectangle RigidBody
 * @extends RigidBody
 */
class Rectangle extends RigidBody {
	static createVertices(width, height) {
		return [
			new vec(-width/2,  height/2),
			new vec( width/2,  height/2),
			new vec( width/2, -height/2),
			new vec(-width/2, -height/2),
		];
	}

	/**
	 * 
	 * @param {Engine} Engine - Engine to add to
	 * @param {number} width - Width of rectangle
	 * @param {number} height - Height of rectangle
	 * @param {vec} position - Position of body
	 * @param {object} options - (RigidBody)[./RigidBody.html] options
	 */
	constructor(Engine, width, height, position, options = {}) {
		super(Engine, Rectangle.createVertices(width, height), position, options);

		this.width = width;
		this.height = height;
		this.nodeType = "Rectangle";
	}
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "Rectangle",
			width: this.width,
			height: this.height,
			angle: this.angle,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			width: this.width,
			height: this.height,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);

		return this;
	}
}
module.exports = Rectangle;


/***/ }),

/***/ 27:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RigidBody = __webpack_require__(301);
const vec = __webpack_require__(811);
const PolygonRender = __webpack_require__(219);
const Sprite = __webpack_require__(416);

/**
 * A RegularPolygon RigidBody
 * @extends RigidBody
 */
class RegularPolygon extends RigidBody {
	static createVertices(radius, verticeCount = 0) {
		verticeCount = verticeCount || Math.round(Math.pow(radius, 1/3) * 2.8);
		let angle = Math.PI * 2 / verticeCount;
		let vertices = [];
		for (let i = 0; i < verticeCount; i++) {
			vertices.push(new vec(Math.cos(angle * i + angle / 2) * radius, Math.sin(angle * i + angle / 2) * radius));
		}
		return vertices;
	}

	/**
	 * 
	 * @param {Engine} Engine - Engine to add to
	 * @param {number} radius - Radius of RegularPolygon
	 * @param {number} verticeCount - Number of vertices and sides of the polygon
	 * @param {vec} position - Position of body
	 * @param {object} options - (RigidBody)[./RigidBody.html] options
	 */
	constructor(Engine, radius, verticeCount, position, options = {}) {
		super(Engine, RegularPolygon.createVertices(radius, verticeCount), position, options);

		this.radius = radius;
		this.nodeType = "RegularPolygon";
	}
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			angle: this.angle,
			subtype: "RegularPolygon",
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			width:  this.radius * 2,
			height: this.radius * 2,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);

		return this;
	}
}
module.exports = RegularPolygon;


/***/ }),

/***/ 929:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);

/**
 * @namespace
 */
let Common = {
	clamp: function(x, min, max) { // clamps x so that min <= x <= max
		return Math.max(min, Math.min(x, max));
	},
	angleDiff: function(angle1, angle2) { // returns the signed difference between 2 angles
		function mod(a, b) {
			return a - Math.floor(a / b) * b;
		}
		return mod(angle1 - angle2 + Math.PI, Math.PI * 2) - Math.PI;
	},
	modDiff: function(x, y, m = 1) { // returns the signed difference between 2 values with any modulo, ie 11 oclock is 2 hours from 1 oclock with m = 12
		function mod(a, b) {
			return a - Math.floor(a / b) * b;
		}
		return mod(x - y + m/2, m) - m/2;
	},

	/**
	 * Pairs 2 positive integers, returning a unique number for each possible pairing using elegant pairing - http://szudzik.com/ElegantPairing.pdf
	 * @param {number} x - 1st number, must be positive integer
	 * @param {number} y - 2nd number, must be positive integer
	 * @return {number} Unique number from those 
	 */
	pair: function(x, y) {
		if (x > y)
			return x*x + x + y;
		return y*y + x;
	},
	/**
	 * Takes a paired number and returns the x/y values that created that number
	 * @param {number} n Paired number
	 * @return {vec} Pair of x/y that created that pair
	 */
	unpair: function(n) {
		let z = Math.floor(Math.sqrt(n));
		let l = n - z * z;
		return l < z ? new vec(l, z) : new vec(z, l - z);
	},

	/**
	 * Pairs 2 positive integers, returning a unique number for each possible pairing using elegant pairing - http://szudzik.com/ElegantPairing.pdf
	 * Returns the same value if x/y are switched
	 * @param {number} x - 1st number, must be positive integer
	 * @param {number} y - 2nd number, must be positive integer
	 * @return {number} Unique number from those 
	 */
	pairCommon: function(x, y) { // Elegant pairing function, but gives the same result if x/y are switched
		if (x > y)
			return x*x + x + y;
		return y*y + y + x;
	},

	/**
	 * Calculates the center of mass of a convex body. Uses algorithm from https://bell0bytes.eu/centroid-convex/
	 * @param {Array} vertices - Array of `vec`s to find the center of 
	 */
	getCenterOfMass(vertices) {
		let centroid = new vec(0, 0);
		let det = 0;
		let tempDet = 0;
		let numVertices = vertices.length;

		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			let nextVert = vertices[(i + 1) % numVertices];

			tempDet = curVert.x * nextVert.y - nextVert.x * curVert.y;
			det += tempDet;

			centroid.add2(new vec((curVert.x + nextVert.x) * tempDet, (curVert.y + nextVert.y) * tempDet));
		}

		centroid.div2(3 * det);

		return centroid;
	},

	/**
	 * Parses a color into its base hex code and alpha. Supports hex, hex with alpha, rgb, and rgba
	 * @param {string} originalColor - Color to be parsed
	 * @return {Array} Array of [hex code, alpha] of parsed color
	 */
	parseColor: function(originalColor) {
		if (originalColor === "transparent") {
			return ["#000000", 0];
		}
		let color;
		let alpha = 1;

		if (originalColor[0] === "#" && originalColor.length === 9) { // is a hex code with alpha
			color = originalColor.slice(0, 7);
			alpha = parseInt(originalColor.slice(7), 16) / 256; // convert to decimel
		}
		else if (originalColor[0] === "#" && originalColor.length === 7) { // is a hex code w/0 alpha
			color = originalColor;
			alpha = 1;
		}
		else if (originalColor.slice(0, 4) === "rgb(") { // rgb
			color = originalColor.slice(originalColor.indexOf("(") + 1, originalColor.indexOf(")")).split(",");
			color = "#" + color.map(value => parseInt(value).toString(16).padStart(2, "0")).join("");
			alpha = 1;
		}
		else if (originalColor.slice(0, 5) === "rgba(") { // rgba
			color = originalColor.slice(originalColor.indexOf("(") + 1, originalColor.indexOf(")")).split(",");
			alpha = parseInt(color.pop()) / 255;
			color = "#" + color.map(value => parseInt(value).toString(16).padStart(2, "0")).join("");
		}
		return [color, alpha];
	},

	/**
	 * Deep copies `objB` onto `objA` in place.
	 * @param {Object} objA - First object
	 * @param {Object} objB - 2nd object, copied onto `objA`
	 * @param {number} maxDepth - Maximum depth it can copy
	 */
	merge: function(objA, objB, maxDepth = Infinity, hash = new WeakSet()) {
		hash.add(objB);

		Object.keys(objB).forEach(option => {
			let value = objB[option];
			
			if (Array.isArray(value)) {
				objA[option] = [ ...value ];
			}
			else if (typeof value === "object" && value !== null) {
				if (maxDepth > 1) {
					if (hash.has(value)) { // Cyclic reference
						objA[option] = value;
						return;
					}
					if (typeof objA[option] !== "object") {
						objA[option] = {};
					}
					Common.merge(objA[option], value, maxDepth - 1, hash);
				}
				else {
					objA[option] = value;
				}
			}
			else {
				objA[option] = value;
			}
		});
	},
	
	/**
	 * Finds if a variable is a class in disguise
	 * @param {*} obj - Variable to check
	 * @return {boolean} If the variable is a class
	 */
	isClass: function(obj) {
		const isCtorClass = obj.constructor
			&& obj.constructor.toString().substring(0, 5) === 'class'
		if(obj.prototype === undefined) {
			return isCtorClass;
		}
		const isPrototypeCtorClass = obj.prototype.constructor 
			&& obj.prototype.constructor.toString
			&& obj.prototype.constructor.toString().substring(0, 5) === 'class'
		return isCtorClass || isPrototypeCtorClass;
	},

	/**
	 * Checks if line `a1`->`a2` is intersecting line `b1`->`b2`, and at what point
	 * @param {vec} a1 - Start of line 1
	 * @param {vec} a2 - End of line 1
	 * @param {vec} b1 - Start of line 2
	 * @param {vec} b2 - End of line 2
	 * @return {vec|object} Point of intersection, or null if they don't intersect
	 */
	lineIntersects: function(a1, a2, b1, b2) { // tells you if lines a1->a2 and b1->b2 are intersecting, and at what point
		if (a1.x === a2.x || a1.y === a2.y) {
			a1 = new vec(a1);
		}
		if (b1.x === b2.x || b1.y === b2.y) {
			b1 = new vec(b1);
		}
		if (a1.x === a2.x)
			a1.x += 0.00001;
		if (b1.x === b2.x)
			b1.x += 0.00001;
		if (a1.y === a2.y)
			a1.y += 0.00001;
		if (b1.y === b2.y)
			b1.y += 0.00001;

		let d = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
		if (d === 0) return null;

		let nx = (a1.x * a2.y - a1.y * a2.x) * (b1.x - b2.x) - (a1.x - a2.x) * (b1.x * b2.y - b1.y * b2.x);
		let ny = (a1.x * a2.y - a1.y * a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x * b2.y - b1.y * b2.x);

		let pt = new vec(nx / d, ny / d);

		let withinX = pt.x > Math.min(a1.x, a2.x) && pt.x < Math.max(a1.x, a2.x) && pt.x > Math.min(b1.x, b2.x) && pt.x < Math.max(b1.x, b2.x);
		let withinY = pt.y > Math.min(a1.y, a2.y) && pt.y < Math.max(a1.y, a2.y) && pt.y > Math.min(b1.y, b2.y) && pt.y < Math.max(b1.y, b2.y);
		if (withinX && withinY) {
			return pt;
		}
		else {
			return null;
		}
	},

	/**
	 * Tests if line `a1`->`a2` is intersecting `body`
	 * @param {vec} a1 - Start of line
	 * @param {vec} a2 - End of line
	 * @param {RigidBody} body - Body to test
	 * @return {boolean} If the line is intersecting the body
	 */
	lineIntersectsBody: function(a1, a2, body) { // tells you if line a1->a2 is intersecting with body, returns true/false
		if (body.children.length > 0) {
			for (let child of body.children) {
				if (Common.lineIntersectsBody(a1, a2, child)) {
					return true;
				}
			}
			return false;
		}
		let ray = a2.sub(a1);
		let rayNormalized = ray.normalize();
		let rayAxes = [ rayNormalized, rayNormalized.normal() ];
		let rayVertices = [ a1, a2 ]; 

		function SAT(verticesA, verticesB, axes) {
			for (let axis of axes) {
				let boundsA = { min: Infinity, max: -Infinity };
				let boundsB = { min: Infinity, max: -Infinity };
				for (let vertice of verticesA) {
					let projected = vertice.dot(axis);
					if (projected < boundsA.min) {
						boundsA.minVertice
					}
					boundsA.min = Math.min(boundsA.min, projected);
					boundsA.max = Math.max(boundsA.max, projected);
				}
				for (let vertice of verticesB) {
					let projected = vertice.dot(axis);
					boundsB.min = Math.min(boundsB.min, projected);
					boundsB.max = Math.max(boundsB.max, projected);
				}

				if (boundsA.min > boundsB.max || boundsA.max < boundsB.min) { // they are NOT colliding on this axis
					return false;
				}
			}
			return true;
		}
		// SAT using ray axes and body axes
		return SAT(rayVertices, body.vertices, rayAxes) && SAT(rayVertices, body.vertices, body.axes);
	},

	/**
	 * Finds the static bodies around the ray from `start` to `end`. Useful for getting bodies when calling `Common.raycast` or `Common.raycastSimple`
	 * @param {vec} start - Start of ray
	 * @param {vec} end - End of ray
	 * @param {World} World - World to get bodies from
	 */
	getRayNearbyStaticBodies(start, end, World) {
		let grid = World.staticGrid;
		let size = grid.gridSize;
		let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
		let bodies = new Set();

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = grid.pair(new vec(x, y));
				let node = grid.grid[n];

				if (node) {
					for (let body of node) {
						if (!bodies.has(body)) {
							bodies.add(body);
						}
					}
				}
			}
		}
	},
	getRayNearbyDynamicBodies(start, end, World) {
		let grid = World.dynamicGrid;
		let size = grid.gridSize;
		let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
		let bodies = new Set();

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = grid.pair(new vec(x, y));
				let node = grid.grid[n];

				if (node) {
					for (let body of node) {
						if (!bodies.has(body)) {
							bodies.add(body);
						}
					}
				}
			}
		}
	},

	/**
	 * 
	 * @param {vec} start - Start of ray
	 * @param {vec} end - End of ray
	 * @param {Array} [bodies] - Array of bodies to test
	 * @return {Object} { collision: boolean, distance: Number, point: vec, body: RigidBody, verticeIndex: Number }
	 */
	raycast: function(start, end, bodies = []) {
		let lineIntersects = Common.lineIntersects;
		let minDist = Infinity;
		let minPt = null;
		let minBody = null;
		let minVert = -1;

		for (let i = 0; i < bodies.length; i++) {
			let body = bodies[i];
			let { vertices } = body;
			let len = vertices.length;

			for (let i = 0; i < len; i++) {
				let cur = vertices[i];
				let next = vertices[(i + 1) % len];

				let intersection = lineIntersects(start, end, cur, next);
				if (intersection) {
					let dist = intersection.sub(start).length;
					if (dist < minDist) {
						minDist = dist;
						minPt = intersection;
						minBody = body;
						minVert = i;
					}
				}
			}
		}

		return {
			collision: minPt !== null,
			distance: minDist,
			point: minPt,
			body: minBody,
			verticeIndex: minVert,
		};
	},
	raycastSimple: function(start, end, bodies) { // raycast that only tells you if there is a collision (usually faster), returns true/false
		let lineIntersectsBody = Common.lineIntersectsBody;

		for (let body of bodies) {
			let intersection = lineIntersectsBody(start, end, body);
			if (intersection) {
				return true;
			}
		}
		return false;
	},
	boundCollision: function(boundsA, boundsB) { // checks if 2 bounds { min: vec, max: vec } are intersecting, returns true/false
		return (boundsA.max.x >= boundsB.min.x && boundsA.min.x <= boundsB.max.x && 
				boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
	},
	pointInBounds: function(point, bounds) { // checks if a point { x: x, y: y } is within bounds { min: vec, max: vec }, returns true/false
		return (point.x >= bounds.min.x && point.x <= bounds.max.x && 
				point.y >= bounds.min.y && point.y <= bounds.max.y);
	},

	/**
	 * Deletes first instance of `value` from `array`
	 * @param {Array} array Array item is deleted from
	 * @param {*} value Value deleted from array
	 */
	arrayDelete(array, value) {
		let index = array.indexOf(value);
		if (index !== -1) {
			array.splice(index, 1);
		}
	}
}
module.exports = Common;


/***/ }),

/***/ 830:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const World = __webpack_require__(569);
const Render = __webpack_require__(681);
const DebugRender = __webpack_require__(334);
const Engine = __webpack_require__(726);
const Common = __webpack_require__(929);
const PerformanceRender = __webpack_require__(763);
const Ticker = __webpack_require__(754);
const Bodies = __webpack_require__(789);

/**
 * Handles numerous aspects of the game for you, such as the world, physics engine, rendering, ticking, and making bodies.
 */
class Game {
	static defaultOptions = {
		World: World.defaultOptions,
		Render: Render.defaultOptions,
		Engine: Engine.defaultOptions,
		Ticker: Ticker.defaultOptions,
	}

	/**
	 * Default options:
	 * ```
	 * {
	 * 	World: World.defaultOptions,
	 * 	Render: Render.defaultOptions,
	 * 	Engine: Engine.defaultOptions,
	 * 	Ticker: Ticker.defaultOptions,
	 * }
	 * ```
	 * See documentation for [World](./World.html), [Render](./Render.html), [Engine](./Engine.html), and [Ticker](./Ticker.html) for options
	 * 
	 * @param {Object} options - Options object
	 */
	constructor(options = {}) {
		let defaults = { ...Game.defaultOptions };
		Common.merge(defaults, options, 2);
		options = defaults;

		this.World = new World(options.World);
		this.Engine = new Engine(this.World, options.Engine);
		this.Render = new Render(options.Render);
		this.Ticker = new Ticker(this, options.Ticker);
		this.Bodies = Bodies.createBodyFactory(this.Engine);
		
		setTimeout(() => {
			window.scrollTo(0, 0);
		}, 0);
	}
	/**
	 * Creates a debug rendering context as `this.DebugRender`. See [DebugRender](./DebugRender.html) for more information.
	 */
	createDebugRender() {
		this.DebugRender = new DebugRender(this);

		let Performance = this.Engine.Performance;
		Performance.render = new PerformanceRender(Performance, this.Render);
	}
}
module.exports = Game;


/***/ }),

/***/ 656:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const PerformanceRender = __webpack_require__(763);

/**
 * Tracks performance stats of the game, like fps, delta time, and frame number
 */
class Performance {
	getAvgs = true;
	#lastUpdate = 0;
	/**
	 * The frames per second of the engine.
	 * @type {number}
	 */
	fps = 60;
	/**
	 * The amount of time between frames in seconds.
	 * @type {number}
	 */
	delta = 1;
	/**
	 * The engine frame number. Note that this will increase faster than the number of rendered frames when `Engine.substeps` is greater than 1.
	 * @type {number}
	 */
	frame = 0;

	history = {
		avgFps: 60,
		avgDelta: 1,
		fps: [],
		delta: [],
	}
	engine = {
		delta: 0,
		lastUpdate: 0,
	}

	/**
	 * Creates a Performance object
	 * @param {Render} Render - [Render](./Render.html)
	 */
	constructor(Render = undefined) {
		if (Render) this.render = new PerformanceRender(this, Render);
		this.#lastUpdate = performance.now() / 1000;
	}

	/**
	 * Updates the performance stats. Should be called every frame.
	 */
	update() {
		let curTime = performance.now() / 1000;
		if (curTime - this.#lastUpdate === 0) { // Instantly updating breaks everything
			return;
		}

		this.delta = Math.min(5, curTime - this.#lastUpdate);
		this.fps = 1 / this.delta;
		this.#lastUpdate = curTime;

		this.history.fps.push(this.fps);
		this.history.delta.push(this.delta);

		if (this.history.fps.length > 200) {
			this.history.fps.shift();
			this.history.delta.shift();
		}
		let fps = (() => {
			let v = 0;
			for (let i = 0; i < this.history.fps.length; i++) {
				v += this.history.fps[i];
			}
			return v / this.history.fps.length;
		})();
		let delta = (() => {
			let v = 0;
			for (let i = 0; i < this.history.delta.length; i++) {
				v += this.history.delta[i];
			}
			return v / this.history.delta.length;
		})();

		this.history.avgFps = fps;
		this.history.avgDelta = delta;
	}
};
module.exports = Performance;


/***/ }),

/***/ 754:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Common = __webpack_require__(929);
const Animation = __webpack_require__(847);

/**
 * A game ticker that handles updating the engine every frame.
 */
class Ticker {
	static defaultOptions = {
		pauseOnFreeze: true,
		freezeThreshold: 0.3,
	}

	/**
	 * Creates a ticker that updates [Game](./Game.html) every frame.
	 * @param {Game} Game - Game ticker should be run on
	 * @param {Object} options - Options object
	 * @param {boolean} [options.pauseOnFreeze=true] - If the ticker should pause when the game freezes. Helps prevent jumping when user switches tabs.
	 * @param {number} [options.freezeThreshold=0.3] - The threshold before the game pauses **between 0 and 1**. Higher values means the fps doesn't have to dip as low for the ticker to pause.
	 */
	constructor(Game, options = {}) {
		let defaults = { ...Ticker.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		this.Game = Game;
		this.pauseOnFreeze   = options.pauseOnFreeze;
		this.freezeThreshold = options.freezeThreshold;

		this.tick = this.tick.bind(this);
		window.addEventListener("load", this.tick);
	}
	tick() {
		this.trigger("beforeTick");

		const { Engine } = this.Game;
		const { Performance } = Engine;
		if (this.pauseOnFreeze && Performance.fps / Math.max(1, Performance.history.avgFps) < this.freezeThreshold) {
			Performance.update();
		}
		else {
			Engine.update();
			// animations.run();
		}

		Animation.update();
		this.trigger("afterTick");
		requestAnimationFrame(this.tick);
	}
	
	#events = {
		beforeTick: [],
		afterTick: [],
	}
	/**
	 * Binds a function to an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function called when event fires
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a function from an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function bound to event
	 */
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	/**
	 * Fires an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 */
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}
module.exports = Ticker;


/***/ }),

/***/ 506:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

const vec = __webpack_require__(811);

/**
 * A bezier curve 
 */
class Bezier {
	constructor(pt1, cp1, cp2, pt2) { // start, control 1, control 2, end
		// https://javascript.info/bezier-curve
		// P = ((1−t)^3 * P1) + (3(1−t)^2 * t * P2) + (3(1−t) * t^2 * P3) + (t^3 * P4)
		// arc length = ∫a^b √[1 + (dy/dx)^2] dx
		// arc length = ∫a^b

		if (pt1.a && pt1.b) {
			this.a = new vec(pt1.a);
			this.b = new vec(pt1.b);
			this.c = new vec(pt1.c);
			this.d = new vec(pt1.d);
		}
		else {
			this.a = new vec(pt1);
			this.b = new vec(cp1);
			this.c = new vec(cp2);
			this.d = new vec(pt2);
		}

		this.length = this.getLength();
	}
	getAtT(t) {
		let x = (this.a.x * (1 - t)**3) + (3*this.b.x * t * (1 - t)**2) + (3*this.c.x * (1 - t) * t**2) + (this.d.x * t**3);
		let y = (this.a.y * (1 - t)**3) + (3*this.b.y * t * (1 - t)**2) + (3*this.c.y * (1 - t) * t**2) + (this.d.y * t**3);

		return new vec(x, y);
	}
	getLength(dt = 0.01) {
		let lastPt = this.getAtT(0);
		let len = 0;
		for (let t = dt; t <= 1; t += dt) {
			let pt = this.getAtT(t);
			len += pt.sub(lastPt).length;
			lastPt = pt;
		}
		len += this.getAtT(1).sub(lastPt).length;

		return len;
	}
	get(d) {
		return this.getAtT(d / this.length);
	}
	getDxAtT(t) { // 1st derivative
		let x = 3 * ((this.d.x - 3*this.c.x + 3*this.b.x - this.a.x) * t ** 2 + (2*this.c.x - 4*this.b.x + 2*this.a.x) * t + this.b.x - this.a.x);
		let y = 3 * ((this.d.y - 3*this.c.y + 3*this.b.y - this.a.y) * t ** 2 + (2*this.c.y - 4*this.b.y + 2*this.a.y) * t + this.b.y - this.a.y);

		return new vec(x, y);
	}
	getDx(d) {
		return this.getDxAtT(d / this.length);
	}
	getDx2AtT(t) { // 2nd derivative
		let x = 6 * ((this.d.x - 3*this.c.x + 3*this.b.x - this.a.x) * t + this.c.x - 2*this.b.x + this.a.x);
		let y = 6 * ((this.d.y - 3*this.c.y + 3*this.b.y - this.a.y) * t + this.c.y - 2*this.b.y + this.a.y);

		return new vec(x, y);
	}
	getDx2(d) {
		return this.getDx2AtT(d / this.length);
	}

	toObject() {
		return {
			a: this.a.toObject(),
			b: this.b.toObject(),
			c: this.c.toObject(),
			d: this.d.toObject(),
		};
	}
}
module.exports = Bezier;


/***/ }),

/***/ 60:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);

/**
 * AABB bounds
 */
class Bounds {
	min = new vec(0, 0);
	max = new vec(0, 0);
	constructor(min, max) {
		if (Array.isArray(min)) { // min is an array of vecs
			this.update(min);
		}
		else if (min.min && min.max) { // min is a bounds object
			this.min.set(min.min);
			this.max.set(min.max);
		}
		else { // min and max are vectors
			this.min.set(min);
			this.max.set(max);
		}
	}

	/**
	 * Updates the bounds based on an array vertices
	 * @param {Array} vertices - Array of vertices 
	 */
	update(vertices) {
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;
	
		for (let i = 0; i < vertices.length; i++) {
			let v = vertices[i];
	
			if (v.x < minX) minX = v.x;
			if (v.x > maxX) maxX = v.x;
			if (v.y < minY) minY = v.y;
			if (v.y > maxY) maxY = v.y;
		}
	
		this.min.x = minX;
		this.min.y = minY;
		this.max.x = maxX;
		this.max.y = maxY;
	}

	/**
	 * Creates a random point within the bounds
	 * @return {vec} Random point within bounds
	 */
	randomPoint() {
		let { max, min } = this;
		let x = Math.random() * (max.x - min.x) + min.x;
		let y = Math.random() * (max.y - min.y) + min.y;
		return new vec(x, y);
	}
}
module.exports = Bounds;


/***/ }),

/***/ 953:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const { arrayDelete } = __webpack_require__(929);
const vec = __webpack_require__(811);

/**
 * A broadphase grid that can handle bodies and points
 */
class Grid {
	static id = 0;
	grid = {};
	gridIds = new Set();
	
	/**
	 * The grid size
	 * @type {number}
	 * @instance
	 */
	gridSize = 2000;

	/**
	 * Creates an empty grid
	 * @param {number} size - Size of each grid cell
	 */
	constructor(size = 2000) {
		this.gridSize = size;
		this.id = Grid.id++;
	}
	pair(pos) {
		let x = pos.x >= 0 ? pos.x * 2 : pos.x * -2 - 1;
		let y = pos.y >= 0 ? pos.y * 2 : pos.y * -2 - 1;
		return (x >= y) ? (x * x + x + y) : (y * y + x);
	}
	unpair(n) {
		let sqrtz = Math.floor(Math.sqrt(n));
		let sqz = sqrtz * sqrtz;
		let result1 = ((n - sqz) >= sqrtz) ? new vec(sqrtz, n - sqz - sqrtz) : new vec(n - sqz, sqrtz);
		let x = result1.x % 2 === 0 ? result1.x / 2 : (result1.x + 1) / -2;
		let y = result1.y % 2 === 0 ? result1.y / 2 : (result1.y + 1) / -2;
		return new vec(x, y);
	}
	getBounds(body) {
		let size = this.gridSize;
		if (typeof body.bounds === "object") {
			return {
				min: body.bounds.min.div(size).floor2(),
				max: body.bounds.max.div(size).floor2(),
			}
		}
		else if (body.x !== undefined && body.y !== undefined) {
			let x = Math.floor(body.x / size);
			let y = Math.floor(body.y / size);
			return {
				min: new vec(x, y),
				max: new vec(x, y),
			}
		}
	}
	getBucketIds(bounds) {
		let ids = [];
		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (this.grid[n]) {
					ids.push(n);
				}
			}
		}

		return ids;
	}

	/**
	 * Adds the body to the grid
	 * @param {RigidBody} body - Body added to the grid
	 */
	addBody(body) {
		let bounds = this.getBounds(body);

		if (!bounds) {
			console.error(body);
			throw new Error("Could not find bounds of body");
		}

		if (!body._Grids) body._Grids = {};
		if (!body._Grids[this.id]) body._Grids[this.id] = [];

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				body._Grids[this.id].push(n);
				if (!this.grid[n]) {
					this.grid[n] = [];
					this.gridIds.add(n);
				}
				this.grid[n].push(body);
			}
		}
	}
	/**
	 * Removes the body from the grid
	 * @param {RigidBody} body - Body removed from the grid
	 */
	removeBody(body) {
		for (let n of body._Grids[this.id]) {
			let node = this.grid[n];
			if (node) {
				arrayDelete(node, body);
				if (node.length === 0) {
					delete this.grid[n];
					this.gridIds.delete(n);
				}
			}
		}
		delete body._Grids[this.id];
	}
	/**
	 * Adds a vector point to the grid
	 * @param {vec} point - Point added
	 */
	addPoint(point) {
		if (!point._Grids) point._Grids = {};
		if (!point._Grids[this.id]) point._Grids[this.id] = [];

		let position = point.x ? point : point.position;
		let bucketPos = position.div(this.gridSize).floor2();
		let n = this.pair(bucketPos);
		point._Grids[this.id].push(n);
		if (!this.grid[n]) {
			this.grid[n] = [];
			this.gridIds.add(n);
		}
		this.grid[n].push(point);
	}
	/**
	 * Remove a vector point from the grid
	 * @param {vec} point - Point removed
	 */
	removePoint(point) {
		if (!point._Grids) {
			console.error(point);
			throw new Error("Can't remove point that isn't in grid");
		}
		for (let n of point._Grids[this.id]) {
			let node = this.grid[n];
			if (node) {
				arrayDelete(node, point);
				if (node.length === 0) {
					delete this.grid[n];
					this.gridIds.delete(n);
				}
			}
		}
		delete point._Grids[this.id];
	}
	/**
	 * Updates the body's position in the grid
	 * @param {RigidBody|vec} body - Body in the grid
	 */
	updateBody(body) {
		let curNodes = body._Grids[this.id];
		let oldNodes = new Set(curNodes);
		let bounds = this.getBounds(body);
		
		if (!bounds) {
			console.error(body);
			throw new Error("Could not find bounds of body");
		}

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (!oldNodes.has(n)) {
					curNodes.push(n);
					if (!this.grid[n]) {
						this.grid[n] = [];
						this.gridIds.add(n);
					}
					this.grid[n].push(body);
				}
				else {
					oldNodes.delete(n);
				}
			}
		}

		for (let n of oldNodes) {
			let node = this.grid[n];
			arrayDelete(curNodes, n);
			if (!node) continue;
			arrayDelete(node, body);
			if (node.length === 0) {
				delete this.grid[n];
				this.gridIds.delete(n);
			}
		}
	}
}
module.exports = Grid;


/***/ }),

/***/ 811:
/***/ ((module) => {

/**
 * A 2d vector
 */
class vec {
	/**
	 * Creates a new vector
	 * @param {number|Array|object} x - x coordinate
	 * @param {number} [y=undefined]  - y coordinate
	 */
	constructor(x, y) {
		if (typeof x === "object") {
			if (Array.isArray(x)) {
				this.x = x[0];
				this.y = x[1];
			}
			else {
				this.x = x.x;
				this.y = x.y;
			}
		}
		else if (typeof x === "number" && y === undefined) {
			this.x = Math.cos(x);
			this.y = Math.sin(x);
		}
		else {
			this.x = x;
			this.y = y;
		}

		return this;
	}
	/**
	 * Adds `vec2` to `this`, returning a new vector
	 * @param {vec|number} vec2 - 
	 * @return {vec} New vector
	 */
	add(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x + vec2, this.y + vec2);
		}
		else {
			return new vec(this.x + vec2.x, this.y + vec2.y);
		}
	}
	/**
	 * Subtracts `vec2` from `this`, returning a new vector
	 * @param {vec|number} vec2 - 
	 * @return {vec} New vector
	 */
	sub(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x - vec2, this.y - vec2);
		}
		else {
			return new vec(this.x - vec2.x, this.y - vec2.y);
		}
	}
	/**
	 * Multiplies `this` by `vec2`, returning a new vector
	 * @param {vec|number} vec2 - 
	 * @return {vec} New vector
	 */
	mult(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x * vec2, this.y * vec2);
		}
		else {
			return new vec(this.x * vec2.x, this.y * vec2.y);
		}
	}
	/**
	 * Divides `this` by `vec2`, returning a new vector
	 * @param {vec|number} vec2 - 
	 * @return {vec} New vector
	 */
	div(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x / vec2, this.y / vec2);
		}
		else {
			return new vec(this.x / vec2.x, this.y / vec2.y);
		}
	}
	/**
	 * Adds `vec2` to `this` in place, returning `this`
	 * @param {vec|number} vec2 - 
	 * @return {vec} `this`
	 */
	add2(vec2) {
		if (typeof vec2 === "number") {
			this.x += vec2;
			this.y += vec2;
			return this;
		}
		else {
			this.x += vec2.x;
			this.y += vec2.y;
			return this;
		}
	}
	/**
	 * Subtracts `vec2` from `this` in place, returning `this`
	 * @param {vec|number} vec2 - 
	 * @return {vec} `this`
	 */
	sub2(vec2) {
		if (typeof vec2 === "number") {
			this.x -= vec2;
			this.y -= vec2;
			return this;
		}
		else {
			this.x -= vec2.x;
			this.y -= vec2.y;
			return this;
		}
	}
	/**
	 * Multiplies `this` by `vec2` in place, returning `this`
	 * @param {vec|number} vec2 - 
	 * @return {vec} `this`
	 */
	mult2(vec2) {
		if (typeof vec2 === "number") {
			this.x *= vec2;
			this.y *= vec2;
			return this;
		}
		else {
			this.x *= vec2.x;
			this.y *= vec2.y;
			return this;
		}
	}
	/**
	 * Divides `this` by `vec2` in place, returning `this`
	 * @param {vec|number} vec2 - 
	 * @return {vec} `this`
	 */
	div2(vec2) {
		if (typeof vec2 === "number") {
			this.x /= vec2;
			this.y /= vec2;
			return this;
		}
		else {
			this.x /= vec2.x;
			this.y /= vec2.y;
			return this;
		}
	}
	/**
	 * Raises `this` to the power of `vec2`
	 * @param {vec|number} vec2 - 
	 * @return {vec} New vector
	 */
	pow(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x ** vec2, this.y ** vec2);
		}
		else {
			return new vec(this.x ** vec2.x, this.y ** vec2.y);
		}
	}
	/**
	 * Raises `this` to the power of `vec2` in place
	 * @param {vec|number} vec2 - 
	 * @return {vec} `this`
	 */
	pow2(vec2) {
		if (typeof vec2 === "number") {
			this.x = this.x ** vec2;
			this.y = this.y ** vec2;
			return this;
		}
		else {
			this.x = this.x ** vec2.x;
			this.y = this.y ** vec2.y;
			return this;
		}
	}
	/**
	 * Finds the signed values of `x` and `y`
	 * @example
	 * let signed = new vec(4, -2).sign(); // signed = { x: 1, y: -1 }
	 * @return {vec} New vector
	 */
	sign() {
		return new vec(Math.sign(this.x), Math.sign(this.y));
	}
	/**
	 * Finds the signed values of `x` and `y` in place
	 * @example
	 * let signed = new vec(0, -4);
	 * signed.sign2(); // signed = { x: 0, y: -1 }
	 * @return {vec} `this`
	 */
	sign2() {
		this.x = Math.sign(this.x);
		this.y = Math.sign(this.y);
		return this;
	}
	/**
	 * Finds the modulus of `this` and `vec2`
	 * @param {vec} vec2 - 
	 * @example
	 * let mod = new vec(14, 4).mod(new vec(2, 3)); // mod = { x: 0, y: 1 }
	 * @return {vec} New vector
	 */
	mod(vec2) {
		if (typeof vec2 === "number")
			return new vec(this.x % vec2, this.y % vec2);
		return new vec(this.x % vec2.x, this.y % vec2.y);
	}
	/**
	 * Finds the modulus of `this` and `vec2` in place
	 * @param {vec} vec2 - 
	 * @example
	 * let mod = new vec(-2, 6);
	 * mod.mod2(new vec(3, 4)); // mod = { x: -2, y: 2 }
	 * @return {vec} `this`
	 */
	mod2(vec2) {
		if (typeof vec2 === "number") {
			this.x %= vec2;
			this.y %= vec2;
		}
		else {
			this.x %= vec2.x;
			this.y %= vec2.y;
		}
		return this;
	}
	/**
	 * Finds dot product of `this` and `vec2`
	 * @param {vec} vec2 - 
	 * @return {number} Dot product
	 */
	dot(vec2) {
		return this.x * vec2.x + this.y * vec2.y;
	}
	/**
	 * Finds 2d cross product of `this` and `vec2`
	 * @param {vec|number} vec2 - 
	 * @return {number|vec} New vector
	 */
	cross(vec2) {
		if (typeof vec2 === "number") {
			return new vec(-vec2 * this.y, vec2 * this.x);
		}
		else {
			return this.x * vec2.y - this.y * vec2.x;
		}
	}
	/**
	 * Finds average of `this` and `vec2`
	 * @param {vec} vec2 - Second vector
	 * @param {number} weight - Weight that `this` has in the average
	 * @return {vec} New vector
	 */
	avg(vec2, weight = 0.5) {
		let weight2 = 1 - weight;
		return new vec(this.x * weight + vec2.x * weight2, this.y * weight + vec2.y * weight2);
	}
	/**
	 * Finds the length of `this`
	 * @return {number} Length
	 */
	get length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	/**
	 * Sets the length of `this`, keeping its direction the same
	 * @param {number} len - New length
	 * @example
	 * let v = new vec(1, 1);
	 * v.length = 10; // v = { x: 7.07, y: 7.07 }
	 */
	set length(len) {
		let scale = len / this.length;
		this.x *= scale;
		this.y *= scale;
	}
	/**
	 * Finds the angle of `this`
	 * @return {number} Angle, in radians
	 */
	get angle() {
		return Math.atan2(this.y, this.x);
	}
	/**
	 * Finds area of the rectangle created by `this`
	 * @return {number} Area
	 */
	get area() {
		return this.x * this.y;
	}
	/**
	 * Finds the manhattan distance (x + y) between `vec` and `this`
	 * @param {vec} vec2
	 * @return {number} Distnace
	 */
	manhattan(vec2) {
		return Math.abs(vec2.x - this.x) + Math.abs(vec2.y - this.y);
	}
	/**
	 * Takes the absolute value of `x` and `y`
	 * @return {vec} New vector
	 */
	abs() {
		return new vec(Math.abs(this.x), Math.abs(this.y));
	}
	/**
	 * Takes the absolute value of `x` and `y` in place
	 * @return {vec} `this`
	 */
	abs2() {
		this.x = Math.abs(this.x);
		this.y = Math.abs(this.y);
		return this;
	}
	/**
	 * Reflects `this` over `vec2`. `vec2` must be normalized
	 * @param {vec} vec2 - Normalized vector reflected across
	 * @return {vec} New reflected vector
	 */
	reflect(vec2) { // vec2 must be normalized
		// Vect2 = Vect1 - 2 * WallN * (WallN DOT Vect1)
		let v2 = vec2.normal();
		return this.sub(v2.mult(v2.dot(this) * 2));
	}
	/**
	 * Reflects `this` over `vec2` in place. `vec2` must be normalized
	 * @param {vec} vec2 - Normalized vector reflected across
	 * @return {vec} `this`
	 */
	reflect2(vec2) { // vec2 must be normalized
		let v2 = vec2.normal();
		return this.sub2(v2.mult(v2.dot(this) * 2));
	}
	/**
	 * Rotates `this` by `angle`
	 * @param {number} angle - Angle rotated by, in radians
	 * @return {vec} New rotated vector
	 */
	rotate(angle) {
		return new vec(Math.cos(angle) * this.x - Math.sin(angle) * this.y, Math.sin(angle) * this.x + Math.cos(angle) * this.y);
	}
	/**
	 * Rotates `this` by `angle` in place
	 * @param {number} angle - Angle rotated by, in radians
	 * @return {vec} `this`
	 */
	rotate2(angle) {
		let x = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
		this.y = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
		this.x = x;
		return this;
	}
	/**
	 * Projects `this` onto `vec2`
	 * @param {vec} vec2 - Vector projected onto
	 * @param {boolean} [bound=false] - If the projected vector should be forced between the bounds of `vec2`
	 * @return {vec} New rotated vector
	 */
	project(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		return new vec(d1 * vec2.x / d2, d1 * vec2.y / d2);
	}
	/**
	 * Projects `this` onto `vec2` in place
	 * @param {vec} vec2 - Vector projected onto
	 * @param {boolean} [bound=false] - If the projected vector should be forced between the bounds of `vec2`
	 * @return {vec} `this`
	 */
	project2(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		this.x = d1 * vec2.x / d2;
		this.y = d1 * vec2.y / d2;

		return this;
	}
	/**
	 * Normalizes `this`, making its length 1
	 * @return {vec} New vector
	 */
	normalize() {
		let len = this.length;
		if (len === 0) return new vec(this);
		return new vec(this.x / len, this.y / len);
	}
	/**
	 * Normalizes `this` in place, making its length 1
	 * @return {vec} `this`
	 */
	normalize2() {
		let len = this.length;
		if (len === 0) return this;
		this.x /= len;
		this.y /= len;
		return this;
	}
	/**
	 * Finds the left hand normal
	 * @return {vec} New vector
	 */
	normal() { // left hand normal
		return new vec(this.y, -this.x);
	}
	/**
	 * Finds the left hand normal in place
	 * @return {vec} `this`
	 */
	normal2() { // left hand normal
		let y = this.y;
		this.y = -this.x;
		this.x = y;
		return this;
	}
	/**
	 * Rounds `x` and `y` components down
	 * @return {vec} New vector
	 */
	floor() {
		return new vec(Math.floor(this.x), Math.floor(this.y));
	}
	/**
	 * Rounds `x` and `y` components down in place
	 * @return {vec} `this`
	 */
	floor2() {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	}
	/**
	 * Rounds `x` and `y` components up
	 * @return {vec} New vector
	 */
	ceil() {
		return new vec(Math.ceil(this.x), Math.ceil(this.y));
	}
	/**
	 * Rounds `x` and `y` components up in place
	 * @return {vec} `this`
	 */
	ceil2() {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	}
	/**
	 * Rounds `x` and `y` components
	 * @return {vec} New vector
	 */
	round() {
		return new vec(Math.round(this.x), Math.round(this.y));
	}
	/**
	 * Rounds `x` and `y` components in place
	 * @return {vec} `this`
	 */
	round2() {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	}
	/**
	 * Finds  the minimum `x` and `y` components between `this` and `vec2`
	 * @param {vec} vec2
	 * @return {vec} New vector
	 */
	min(vec2) {
		return new vec(Math.min(vec2.x, this.x), Math.min(vec2.y, this.y));
	}
	/**
	 * Finds  the minimum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} vec2
	 * @return {vec} `this`
	 */
	min2(vec2) {
		this.x = Math.min(this.x, vec2.x);
		this.y = Math.min(this.y, vec2.y);
		return this;
	}
	/**
	 * Finds the maximum `x` and `y` components between `this` and `vec2`
	 * @param {vec} vec2
	 * @return {vec} New vector
	 */
	max(vec2) {
		return new vec(Math.max(vec2.x, this.x), Math.max(vec2.y, this.y));
	}
	/**
	 * Finds the maximum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} vec2
	 * @return {vec} `this`
	 */
	max2(vec2) {
		this.x = Math.max(this.x, vec2.x);
		this.y = Math.max(this.y, vec2.y);
		return this;
	}
	/**
	 * Clamps `x` and `y` components between `min` and `max`
	 * @param {vec} min
	 * @param {vec} max
	 * @return {vec} New vector
	 */
	clamp(min, max) {
		return new vec(Math.max(min.x, Math.min(max.x, this.x)), Math.max(min.y, Math.min(max.y, this.y)));
	}
	/**
	 * Finds  the maximum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} min
	 * @param {vec} max
	 * @return {vec} `this`
	 */
	clamp2(min, max) {
		this.x = Math.max(min.x, Math.min(max.x, this.x));
		this.y = Math.max(min.y, Math.min(max.y, this.y));
		return this;
	}
	/**
	 * Checks if `this` equals `vec2`. DOES NOT take into account floating point error.
	 * @param {vec} vec2
	 * @return {boolean}
	 */
	equals(vec2) {
		return this.x === vec2.x && this.y === vec2.y;
	}
	/**
	 * Sets the `x` and `y` components to be the same as `vec2` in place
	 * @param {vec} vec2
	 * @return {vec} `this`
	 */
	set(vec2) {
		this.x = vec2.x;
		this.y = vec2.y;
		return this;
	}
	/**
	 * Creates a string in the format `"{ x : x, y: y }"`
	 */
	toString() {
		return `{ x: ${ this.x }, y: ${ this.y } }`;
	}
	/**
	 * Creates a string in the format `"{ x : x, y: y }"`, with `x` and `y` rounded
	 */
	toStringInt() {
		return `{ x: ${ Math.round(this.x) }, y: ${ Math.round(this.y) } }`;
	}
	/**
	 * Creates js object in the form of `{ x: x, y: y }`
	 * @return {Object}
	 */
	toObject() {
		return { x: this.x, y: this.y };
	}
	/**
	 * Creates a array in the format `[x, y]`
	 */
	toArray() {
		return [this.x, this.y];
	}
	/**
	 * Finds if any part of the vector is NaN
	 * @return {boolean}
	 */
	isNaN() {
		return isNaN(this.x) || isNaN(this.y);
	}
}
module.exports = vec;


/***/ }),

/***/ 593:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const vec = __webpack_require__(811);
const Common = __webpack_require__(929);

/**
 * A generic node object
 */
class Node {
	static id = 0;
	/**
	 * Generates a unique id for nodes
	 * @return {number} A unique integer id
	*/
	static getUniqueId() {
		return ++Node.id;
	}
	
	/**
	 * Type of node, ie `Node` or `RigidBody`
	 * @readonly
	 */
	nodeType = "Node";

	/**
	 * Position of the node
	 * @type {vec}
	 * @readonly
	 * @todo Implement getPosition method and make this private
	 */
	position = new vec(0, 0);
	/**
	 * Angle, in radians
	 * @type {number}
	 * @readonly
	 * @todo Implement getAngle method and make this private
	 */
	angle = 0;
	/**
	 * Children of the node
	 * To modify, use `addChild()` or `removeChild`.
	 * @readonly
	 * @type {Set}
	 */
	children = new Set();
	/**
	 * If the node is added to the game world. 
	 * @private
	 * @type {boolean}
	 */
	#added = false;
	
	/**
	 * Creates a Node with the given position
	 */
	constructor(position = new vec(0, 0)) {
		this.id = Node.getUniqueId();
		this.position = new vec(position);
	}
	
	/**
	 * Adds this node and its children, triggering the `add` event
	 * @returns {Node} `this`
	 */
	add() {
		if (!this.#added) {
			this.trigger("add");
			this.#added = true;

			for (let child of this.children) {
				child.add();
			}
		}
		return this;
	}
	/**
	 * Removes this node and its children, triggering the `delete` event
	 * @returns {Node} `this`
	 */
	delete() {
		if (this.#added) {
			this.trigger("delete");
			this.#added = false;
	
			for (let child of this.children) {
				child.delete();
			}
		}
		return this;
	}

	/**
	 * Gets if the node is added
	 * @returns {Boolean} if the node is added
	 */
	isAdded() {
		return this.#added;
	}

	/**
	 * Adds all `children` to this node's children
	 * @param {...Node} children - Children added
	 * @example
	 * let parentNode = new Node();
	 * let childNode = new Node();
	 * node.addChild(childNode);
	 */
	addChild(...children) {
		for (let child of children) {
			this.children.add(child);
		}
	}
	/**
	 * Removes all `children` from this node's children
	 * @param {...Node} children - Children removed
	 * @example
	 * let parentNode = new Node();
	 * let childNode = new Node();
	 * node.addChild(childNode); // node.children: Set {childNode}
	 * node.removeChild(childNode); // node.children: Set {}
	 */
	removeChild(...children) {
		for (let child of children) {
			this.children.delete(child);
		}
	}
	
	/**
	 * Sets this node's position to `position`
	 * @example
	 * node.setPosition(new vec(100, 100)); // Sets node's position to (100, 100) 
	 * @param {vec} position - Position the node should be set to
	*/
	setPosition(position) {
		let delta = position.sub(this.position);
		this.translate(delta);
	}
	/**
	 * Shifts this node's position by `positionDelta`
	 * @param {vec} positionDelta - Amount to shift the position
	 */
	translate(positionDelta) {
		this.position.add2(positionDelta);
		for (let child of this.children) {
			child.translate(positionDelta);
		}
	}
	
	/**
	 * Sets the node's angle to `angle`
	 * @param {number} angle - Angle body should be in radians
	 * @example
	 * node.setAngle(Math.PI); // Sets node's angle to Pi radians, or 180 degrees
	 */
	setAngle(angle, pivot = this.position) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			this.translateAngle(delta, pivot);
		}
	}
	
	/**
	 * Rotates the body by `angle`- Relative
	 * @param {number} angle -Amount the body should be rotated, in radians
	 */
	translateAngle(angle, pivot = this.position, pivotPosition = true) {
		if (isNaN(angle)) return;

		this.angle += angle;

		if (pivotPosition) {
			let sin = Math.sin(angle);
			let cos = Math.cos(angle);
			let dist = this.position.sub(pivot);
			let newPosition = new vec((dist.x * cos - dist.y * sin), (dist.x * sin + dist.y * cos)).add(pivot);
			this.setPosition(newPosition);
		}

		for (let child of this.children) {
			child.translateAngle?.(angle, pivot);
		}
	}

	
	#events = {
		delete: [],
		add: [],
	}
	/**
	 * Bind a callback to an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Callback run when event is fired
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a callback from an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Function to unbind
	 */
	off(event, callback) {
		let events = this.#events[event];
		if (events.includes(callback)) {
			events.splice(events.indexOf(callback), 1);
		}
	}
	/**
	 * Triggers an event, firing all bound callbacks
	 * @param {string} event - Name of the event
	 * @param {...*} args - Arguments passed to callbacks
	 */
	trigger(event, ...args) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback(...args);
			});
		}
	}
}
module.exports = Node;


/***/ }),

/***/ 569:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Node = __webpack_require__(593);
const Common = __webpack_require__(929)
const Grid = __webpack_require__(953);
const vec = __webpack_require__(811);
const RigidBody = __webpack_require__(301);
const CollisionShape = __webpack_require__(769);

/**
 * The game world
 * @extends Node
 */
class World extends Node {
	static defaultOptions = {
		gravity: new vec(0, 500),
		gridSize: 500,
	}
	
	gravity = new vec(0, 0);
	timescale = 1;
	time = 0;

	rigidBodies = new Set();
	constraints = new Set();
	pairs = {};

	dynamicGrid;
	staticGrid;
	
	globalPoints = [];
	globalVectors = [];
	
	/**
	 * 
	 * @param {object} options - World options
	 * @param {vec} [options.gravity=vec(0, 500)] - Gravity in pixels / second
	 * @param {number} [options.gridSize=500] - Size of broadphase grid in pixels
	 */
	constructor(options = {}) {
		super();
		let defaults = { ...World.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;

		let { gravity, gridSize } = options;
		this.gravity = new vec(gravity);
		this.dynamicGrid = new Grid(gridSize);
		this.staticGrid = new Grid(gridSize);
	}

	canCollide(filterA, filterB) {
		let { layer: layerA, mask: maskA } = filterA;
		let { layer: layerB, mask: maskB } = filterB;

		let canA = (maskA & layerB) !== 0;
		let canB = (maskB & layerA) !== 0;

		return canA || canB;
	}
	#getPairs(bodies) {
		let pairs = [];
		let canCollide = this.canCollide;

		for (let i = 0; i < bodies.length - 1; i++) {
			let bodyA = bodies[i];
			if (!bodyA.parentNode.hasCollisions)
				continue;
			
			for (let j = i + 1; j < bodies.length; j++) {
				// Do AABB collision test
				let bodyB = bodies[j];
				if (!bodyB.parentNode.hasCollisions || bodyA.parentNode === bodyB.parentNode)
					continue;
				if (!canCollide(bodyA.parentNode.collisionFilter, bodyB.parentNode.collisionFilter))
					continue;
				

				const boundsA = bodyA.bounds;
				const boundsB = bodyB.bounds;

				if (boundsA.min.x <= boundsB.max.x &&
					boundsA.max.x >= boundsB.min.x &&
					boundsA.min.y <= boundsB.max.y &&
					boundsA.max.y >= boundsB.min.y) {
					pairs.push([ bodyA, bodyB ]);
				}
			}
		}

		return pairs;
	}
	get collisionPairs() {
		let canCollide = this.canCollide;
		let dynamicGrid = this.dynamicGrid;
		let staticGrid = this.staticGrid;
		let pair = Common.pairCommon;
		let pairIds = new Set();
		let pairs = [];

		let dynamicBuckets = dynamicGrid.grid;
		let staticBuckets = staticGrid.grid;
		let bucketIds = dynamicGrid.gridIds;

		for (let id of bucketIds) {
			let curDynamicBucket = dynamicBuckets[id];
			let curStaticBucket = staticBuckets[id];
			let curPairs = this.#getPairs(curDynamicBucket); // pair dynamic bodies

			// add static bodies
			if (curStaticBucket) {
				for (let j = 0; j < curDynamicBucket.length; j++) {
					let bodyA = curDynamicBucket[j];
					if (!bodyA.parentNode.hasCollisions)
						continue;
					for (let k = 0; k < curStaticBucket.length; k++) {
						let bodyB = curStaticBucket[k];

						if (!bodyB.parentNode.hasCollisions || bodyA.parentNode.isStatic && bodyB.parentNode.isStatic || bodyA.parentNode === bodyB.parentNode)
							continue;
						if (!canCollide(bodyA.parentNode.collisionFilter, bodyB.parentNode.collisionFilter))
							continue;
	
	
						const boundsA = bodyA.bounds;
						const boundsB = bodyB.bounds;
						
						if (boundsA.min.x <= boundsB.max.x &&
							boundsA.max.x >= boundsB.min.x &&
							boundsA.min.y <= boundsB.max.y &&
							boundsA.max.y >= boundsB.min.y) {
							curPairs.push([ bodyA, bodyB ]);
						}
					}
				}
			}

			for (let j = 0; j < curPairs.length; j++) {
				let curPair = curPairs[j];
				let n = pair(curPair[0].id, curPair[1].id);
				if (!pairIds.has(n)) {
					pairIds.add(n);
					pairs.push(curPair);
				}
			}
		}

		return pairs;
	}

	addChild(...children) {
		super.addChild(...children);

		for (let child of children) {
			// Add to engine
			if (child instanceof RigidBody) {
				this.rigidBodies.add(child);

				for (let rigidChild of child.children) {
					if (rigidChild instanceof CollisionShape) {
						// Add to grids
						if (child.isStatic) {
							this.staticGrid.addBody(rigidChild);
						}
						else {
							this.dynamicGrid.addBody(rigidChild);
						}
					}
				}
			}
		}
	}
	removeChild(...children) {
		super.removeChild(...children);

		for (let child of children) {
			// Remove from engine
			if (child instanceof RigidBody) {
				this.rigidBodies.delete(child);

				for (let child2 of child.children) {
					// Remove from grids
					if (child2._Grids) {
						if (child2._Grids[this.staticGrid.id]) {
							this.staticGrid.removeBody(child2);
						}
						if (child2._Grids[this.dynamicGrid.id]) {
							this.dynamicGrid.removeBody(child2);
						}
					}
				}
			}
			
		}
	}
}
module.exports = World;


/***/ }),

/***/ 847:
/***/ ((module) => {

"use strict";


class Animation {
	/**
	 * A variety of built in ease functions to use for animations<br>
	 * See [easings.net](https://easings.net/) for animation types
	 * @static
	 * 
	 * @property {function} ease.linear
	 * 
	 * @property {function} ease.in.sine
	 * @property {function} ease.in.quadratic
	 * @property {function} ease.in.cubic
	 * @property {function} ease.in.quartic
	 * @property {function} ease.in.quintic
	 * @property {function} ease.in.exponential
	 * @property {function} ease.in.circular
	 * @property {function} ease.in.back
	 * 
	 * @property {function} ease.out.sine
	 * @property {function} ease.out.quadratic
	 * @property {function} ease.out.cubic
	 * @property {function} ease.out.quartic
	 * @property {function} ease.out.quintic
	 * @property {function} ease.out.exponential
	 * @property {function} ease.out.circular
	 * @property {function} ease.out.back
	 * 
	 * @property {function} ease.inOut.sine
	 * @property {function} ease.inOut.quadratic
	 * @property {function} ease.inOut.cubic
	 * @property {function} ease.inOut.quartic
	 * @property {function} ease.inOut.quintic
	 * @property {function} ease.inOut.exponential
	 * @property {function} ease.inOut.circular
	 * @property {function} ease.inOut.back
	 * 
	 * @example
	 * Animation.ease.in.cubic // access the cubic ease in function
	 */
	static ease = {
		/*
		 Linear animation
		*/
		linear: x => x,
		in: {
			sine: x => 1 - Math.cos((x * Math.PI) / 2),
			quadratic: x => x ** 2,
			cubic: x => x ** 3,
			quartic: x => x ** 4,
			quintic: x => x ** 5,
			exponential: x => x === 0 ? 0 : pow(2, 10 * x - 10),
			circular: x => 1 - Math.sqrt(1 - Math.pow(x, 2)),
			back: x => { const c1 = 1.70158; const c3 = c1 + 1; return c3 * x ** 3 - c1 * x ** 2; }
		},
		out: {
			sine: x => Math.sin((x * Math.PI) / 2),
			quadratic: x => 1 - (1 - x) ** 2,
			cubic: x => 1 - Math.pow(1 - x, 3),
			quartic: x => 1 - Math.pow(1 - x, 4),
			quintic: x => 1 - Math.pow(1 - x, 5),
			exponential: x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
			circular: x => Math.sqrt(1 - Math.pow(x - 1, 2)),
			back: x => { const c1 = 2; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
		},
		inOut: {
			sine: x => -(Math.cos(Math.PI * x) - 1) / 2,
			quadratic: x => x < 0.5 ? 2 * x ** 2 : 1 - Math.pow(-2 * x + 2, 2) / 2,
			cubic: x => x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2,
			quartic: x => x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2,
			quintic: x => x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
			exponential: x => x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
			circular: x => x < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2,
			back: x => { const c1 = 1.70158; const c2 = c1 * 1.525; return x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2; },
		}
	};

	static queued = new Set();
	static running = new Set();
	static update() {
		for (let animation of Animation.queued) {
			if (animation.getTime() >= 0) {
				Animation.queued.delete(animation);
				Animation.running.add(animation);
			}
		}
		for (let animation of Animation.running) {
			animation.tick();
		}
	}
	#running = false;
	/**
	 * Gets if the animation is currently running. Running includes any delay that the animation may have.
	 * @returns {boolean} If the animation is running
	 */
	isRunning() {
		return this.#running;
	}

	/**
	 * 
	 * @param {object} options - Animation options
	 * @param {number} [options.duration] - Duration of the animation
	 * @param {function} [options.curve] - Curve function that takes a time between [0, 1] and returns a value between [0, 1]
	 * @param {number} [options.delay] - The amount of delay before the animation starts
	 * @param {function} [options.onstop] - Function that is fired when the animation is forcibly stopped
	 * @param {function} [options.onend] - Function fired when the function completes successfully
	 * @param {function} [options.ontick] - Function fired when the animation ticks every frame. Takes a number between [0, 1] for the animation's progress.
	 * @param {World} [options.World] - World the animation should be bound to. If specified, the animation will use the world's timescale. If not, it will run independent of any world's timescale.
	 */
	constructor({ duration = 0, curve = Animation.ease.linear, delay = 0, onstop, onend, ontick, World = null }) {
		this.duration = duration;
		this.curve = curve;
		this.delay = delay;
		this.onstop = onstop;
		this.onend = onend;
		this.ontick = ontick;
		this.World = World;
	}
	/**
	 * Starts the animation
	 * @returns {Promise} Resolves when the animation completes. Resolves to true if the animation finished, false if it was stopped before it finished.
	 */
	run() {
		if (!this.#running) {
			this.#running = true;
			this.startTime = this.getTimeRaw();
			Animation.queued.add(this);
	
			let animation = this;
			return new Promise((resolve, reject) => {
				animation.resolve = resolve;
				animation.reject = reject;
			});
		}
	}
	getTimeRaw() {
		return (this.World ? this.World.time : performance.now() / 1000);
	}
	getTime() {
		return (this.World ? this.World.time : performance.now() / 1000) - this.startTime - this.delay;
	}
	tick() {
		if (!this.#running) return;

		let time = this.getTime();
		let duration = Math.max(this.duration, 0.00000000001);
		let percent = Math.max(0, Math.min(1, this.curve(time / duration)));
		if (this.ontick) this.ontick(percent);

		if (time / duration >= 1) {
			this.end();
		}
	}

	/**
	 * Stops the animation before it finishes. Triggers `onstop` and resolves promises to `false`.
	 */
	stop() {
		if (this.#running) {
			this.#running = false;
			if (this.onstop) this.onstop();
			if (this.resolve) this.resolve(false);

			Animation.queued.delete(this);
			Animation.running.delete(this);
		}
	}
	end() {
		if (this.#running) {
			this.#running = false;
			if (this.onend) this.onend();
			if (this.resolve) this.resolve(true);
		}
	}
}

module.exports = Animation


/***/ }),

/***/ 218:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Animation = __webpack_require__(847);

class DiscreteAnimation {
	static all = new Set();
	static update() {
		const now = performance.now();
		for (let animation of DiscreteAnimation.all) {
			let { startTime, duration, frames, lastFrame, curve, totalLoops, loopNumber } = animation;
			let pLinear = Math.max(0, Math.min(1, (now - startTime) / duration));
			let p = curve(pLinear);
			
			if (pLinear >= 1) {
				if (loopNumber + 1 < totalLoops) {
					animation.loopNumber++;
					animation.startTime = now;
					p = curve(0);
				}
				else {
					animation.lastFrame = frames - 1;
					if (animation.stop) animation.stop();
				}
			}

			let frame = Math.floor(p * frames);
			animation.frame = frame;
			if (p < 1 && frame !== lastFrame) {
				animation.lastFrame = frame;
				if (animation.callback) animation.callback(frame);
			}
		}
	}

	constructor({ frames, duration = 200, curve = Animation.ease.linear, callback, onstart, onend, totalLoops = 1, autostart = false }) {
		this.frame = 0;
		this.frames = frames;
		this.duration = duration;
		this.startTime = performance.now();
		this.curve = curve;
		this.pauseTime = 0;
		this.lastFrame = -1;
		this.loopNumber = 0;
		this.totalLoops = totalLoops ?? 1;

		this.callback = callback;
		this.onstart = onstart;
		this.onend = onend;
		this.playing = false;

		if (autostart && totalLoops > 0) {
			DiscreteAnimation.all.add(this);
			if (typeof this.onstart === "function") this.onstart();
		}
	}
	stop() {
		if (this.playing) {
			if (typeof this.onend === "function") this.onend();
			DiscreteAnimation.all.delete(this);
			this.pauseTime = 0;
			this.lastFrame = -1;
			this.loopNumber = 0;
			this.playing = false;
		}
	}
	pause() {
		if (this.playing) {
			DiscreteAnimation.all.delete(this);
			this.pauseTime = performance.now() - this.startTime;
			this.playing = false;
		}
	}
	start() {
		this.startTime = performance.now() - this.pauseTime;
		DiscreteAnimation.all.add(this);
		this.playing = true;

		if (this.pauseTime === 0 && typeof this.onstart === "function") {
			this.onstart();
		}
	}
}

module.exports = DiscreteAnimation;


/***/ }),

/***/ 794:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);

/**
 * @namespace
 */
let GameFunctions = {
	// returns an array of index(es) that make up edges of voronoi region. 2 points if it's between 2 vertices, 1 point if it's between axes, 0 points if it's inside body
	getVoronoiRegion: function(body, point) { 
		let { vertices } = body;
		let length = vertices.length;
		for (let i = 0; i < length; i++) {
			let vertice = vertices[i];
			let nextVertice = vertices[(i + 1) % length];
			let vertToNext = nextVertice.sub(vertice);
			let axis = vertToNext.normalize();
			let normal = axis.normal();
			let vertToPoint = point.sub(vertice);


			let outside = vertToPoint.dot(normal) >= -10; // theoretically should be 0, but a bit of penetration is allowed in simulation
			let vpDotAxis = vertToPoint.dot(axis);
			let within = vpDotAxis >= 0 && vpDotAxis <= vertToNext.length;

			if (outside && within) {
				return [i, (i + 1) % length];
			}
			else { // check if between axis and lastAxis
				let lastVertice = vertices[(i - 1 + length) % length];
				let lastAxis = lastVertice.sub(vertice).normalize();
				if (vertToPoint.dot(lastAxis) < 0 && vpDotAxis < 0) {
					return [i];
				}
			}
		}
		return [];
	},
	closestPointBetweenBodies: function(bodyA, bodyB) { // returns the closest point on bodyB from the vertices of bodyA
		// should technically be run 2x for (bodyA, bodyB) and (bodyB, bodyA) to find the actual closest points
		let verticesA = bodyA.vertices;
		let verticesB = bodyB.vertices;
		let point = null;
		let minDistance = Infinity;
		for (let i = 0; i < verticesA.length; i++) {
			let verticeA = verticesA[i];
			let region = getVoronoiRegion(bodyB, verticeA);

			if (region.length > 0) {
				let projected;

				if (region.length === 1) {
					projected = new vec(verticesB[region[0]]);
				}
				else if (region.length === 2) {
					let pointBA = verticesB[region[0]];
					let pointBB = verticesB[region[1]];
					let axis = pointBB.sub(pointBA).normalize();
					projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);	
				}

				let distance = projected.sub(verticeA).length;
				if (distance < minDistance) {
					minDistance = distance;
					point = projected;
				}
			}
		}
		return point;
	},
	closestEdgeBetweenBodies: function(bodyA, bodyB) { // returns the closest point and its normal (point and normal are only on bodyB)
		let verticesA = bodyA.vertices;
		let verticesB = bodyB.vertices;
		let point = null;
		let normal = new vec(1, 0);
		let minDistance = Infinity;
		for (let i = 0; i < verticesA.length; i++) {
			let verticeA = verticesA[i];
			let region = getVoronoiRegion(bodyB, verticeA);

			if (region.length > 0) {
				let projected;
				let curNormal;

				if (region.length === 1) {
					projected = new vec(verticesB[region[0]]);
					let prev = verticesB[(region[0] - 1 + verticesB.length) % verticesB.length];
					let next = verticesB[(region[0] + 1) % verticesB.length];
					let axisA = projected.sub(prev).normalize();
					let axisB = next.sub(projected).normalize();
					curNormal = axisA.add(axisB).normalize();
				}
				else if (region.length === 2) {
					let pointBA = verticesB[region[0]];
					let pointBB = verticesB[region[1]];
					let axis = pointBB.sub(pointBA).normalize();
					projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);
					curNormal = axis;
				}

				let distance = projected.sub(verticeA).length;
				if (distance < minDistance) {
					minDistance = distance;
					point = projected;
					normal = curNormal.normal();
				}
			}
		}
		return {
			point: point,
			normal: normal,
		};
	},

	createGradient: function(startPosition, endPosition, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
		let gradient = ctx.createLinearGradient(startPosition.x, startPosition.y, endPosition.x, endPosition.y);
		for (let colorStop of colorStops) {
			gradient.addColorStop(colorStop[1], colorStop[0]);
		}
		return gradient;
	},
	createRadialGradient: function(position, radius, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
		let gradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, radius);
		for (let colorStop of colorStops) {
			gradient.addColorStop(colorStop[1], colorStop[0]);
		}
		return gradient;
	},

	/**
	 * Creates an HTML element using properties
	 * @param {string} type - Element tag name
	 * @param {Object} properties - Properties to add to the element
	 * @returns {Element} The new HTML element
	 * 
	 * @example
	 * // This creates an element with color, background, margin-left, and innerHTML and appends it to document.body
	 * let element = createElement("div", {
	 * 	parent: document.body,
	 * 	innerHTML: "Hello world!",
	 * 	color: "white",
	 * 	background: "#121A21",
	 * 	marginLeft: "20px"
	 * });
	 */
	createElement: function(type, properties) {
		let elem = document.createElement(type);

		function addProperties(elem, properties) {
			Object.keys(properties).forEach(property => {
				if (typeof properties[property] === "object" && !Array.isArray(property) && !(properties[property] instanceof Element)) {
					addProperties(elem[property], properties[property]);
				}
				else {
					if (property === "class") {
						let classes = typeof properties[property] === "string" ? properties[property].split(" ") : properties[property];
						for (let className of classes) {
							elem.classList.add(className);
						}
					}
					else if (property === "parent") {
						properties[property].appendChild(elem);
					}
					else {
						elem[property] = properties[property];
					}
				}
			});
		}
		addProperties(elem, properties);

		return elem;
	},
	gaussianRandom: function(mean = 0, stdev = 1, random = Math.random) { // Standard Normal distribution using Box-Muller transform https://stackoverflow.com/a/36481059
		let u = 1 - random();
		let v = random();
		let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
		return z * stdev + mean;
	},
	createSeededRandom: function(seed) { // Returns function that generates numbers between [0, 1). Adaptation of https://stackoverflow.com/a/19301306
		var mask = 0xffffffff;
		var m_w = (123456789 + seed) & mask;
		var m_z = (987654321 - seed) & mask;
		
		return function() {
			m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
			m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
			var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
			result /= 4294967296;
			return result;
		}
	},
	setCSSVariable: function(varName, value) {
		root.style.setProperty(`--${varName}`, value);
	},

	boundedRandom: function([min, max]) {
		return Math.random() * (max - min) + min;
	},
	boundedRandomPoint: function(bounds) {
		return new vec(boundedRandom([bounds.min.x, bounds.max.x]), boundedRandom([bounds.min.y, bounds.max.y]));
	},
	getMovementDirections: function(direction, threshold = 0.5) {
		direction = direction.normalize();

		let directionNames = {};
		if (direction.x > threshold) {
			directionNames.right = true;
		}
		else if (direction.x < -threshold) {
			directionNames.left = true;
		}
		if (direction.y > threshold) {
			directionNames.down = true;
		}
		else if (direction.y < -threshold) {
			directionNames.up = true;
		}
		return directionNames;
	},
	setMovementDirections: function(controls, directions) {
		for (let controlName of Object.keys(directions)) {
			controls[controlName] = directions[controlName];
		}
	},
	createTilingArea: function(areaBody, sprite, container) { // REMOVE and replace with its own render class
		let texture = PIXI.Texture.from(sprite);
		let { angle, position } = areaBody;
		areaBody.setAngle(0);
		let size = areaBody.bounds.max.sub(areaBody.bounds.min);
		let tiling = new PIXI.TilingSprite(texture, size.x, size.y);
		tiling.zIndex = -1;
		container.addChild(tiling);

		let spritePos = size.mult(-0.5);
		let curPosition = position.add(spritePos.rotate(angle));
		tiling.rotation = angle;
		tiling.position.set(curPosition.x, curPosition.y);
		tiling.spritePos = spritePos;

		tiling.delete = function() {
			container.removeChild(tiling);
			tiling.destroy();
		}

		areaBody.setAngle(angle);

		return tiling;
	},
}
module.exports = GameFunctions;


/***/ }),

/***/ 764:
/***/ ((module) => {

// TODO: Keyup events with multiple buttons work even if the letter key wasn't what was released first
/**
 * Handles key and mouse inputs
 */
class Inputs {
	constructor() {
		window.addEventListener("keydown", event => this.#handleKeydown.call(this, event));
		window.addEventListener("keyup", event => this.#handleKeyup.call(this, event));

		window.addEventListener("mousedown", event => this.#handleMousedown.call(this, event))
		window.addEventListener("mouseup", event => this.#handleMouseup.call(this, event))
	}
	#handleKeydown(event) {
		if (event.repeat) return;

		let key = event.key.toLowerCase();
		let fullKeyName = (event.ctrlKey ? "ctrl" : "") + (event.altKey ? "alt" : "") + (event.shiftKey ? "shift" : "") + key;
		this.#pressed.add(key);

		
		if (this.#binds[fullKeyName]) {
			this.trigger(fullKeyName, true);
		}
		else if (this.#binds[key]) {
			this.trigger(key, true);
		}
	}
	#handleKeyup(event) {
		if (event.repeat) return;

		let key = event.key.toLowerCase();
		let fullKeyName = (event.ctrlKey ? "ctrl" : "") + (event.altKey ? "alt" : "") + (event.shiftKey ? "shift" : "") + key;

		this.#pressed.delete(key);
		
		if (this.#binds[fullKeyName]) {
			this.trigger(fullKeyName, false);
		}
		else if (this.#binds[key]) {
			this.trigger(key, false);
		}
	}
	#handleMousedown(event) {
		let fullName = "mouse" + event.button;
		if (this.#binds[fullName]) {
			this.trigger(fullName, true);
		}
	}
	#handleMouseup(event) {
		let fullName = "mouse" + event.button;
		if (this.#binds[fullName]) {
			this.trigger(fullName, false);
		}
	}
	
	/**
	 * Call to disable the context menu when the user right clicks the window
	 */
	blockRightClick() {
		window.addEventListener("contextmenu", event => {
			event.preventDefault();
		});
	}

	/**
	 * Checks if a key input name is valid and formatted correctly
	 * @param {string} event - Name of key bind
	 * @returns {boolean} If the event is formatted correctly
	 */
	isValidKeyEvent(event) {
		if (event === " ") return true;
		return event.replace(/(ctrl)?(alt)?(shift)?[a-zA-Z]+/i, "").length === 0;
	}
	/**
	 * Checks if a mouse input name is valid and formatted correctly
	 * @param {string} event - Name of key bind
	 * @returns {boolean} If the event is formatted correctly
	 */
	isValidMouseEvent(event) {
		return event.replace(/(mouse)\d+/i, "").length === 0;
	}

	/**
	 * Check if key(s) are currently being pressed
	 * @param {...string} keys - Key to check
	 * @returns {boolean} If the set of keys is pressed
	 * @example
	 * inputs.isPressed("d");
	 * inputs.isPressed("ctrl", "alt", "shift", "s"); // can be in any order
	 */
	isPressed(...keys) {
		if (keys.length === 0) return false;
		for (let k of keys) {
			if (!this.#pressed.has(k)) // A key is not pressed
				return false;
		}
		// All keys are pressed
		return true;
	}

	#pressed = new Set();
	#binds = {};

	/**
	 * Bind a callback to an event
	 * @param {string} event - Keys pressed in event
	 * @param {Function} callback - Callback run when event is fired
	 * @example
	 * // key events
	 * inputs.on("a", keydown => { // called when 'a' is pressed down or up
	 * 	if (keydown) { // 'a' key is depressed
	 * 		// do some logic
	 * 	}
	 * 	else { // 'a' key is no longer depressed
	 * 		// logic
	 * 	}
	 * });
	 * inputs.on("altW", keydown => {}); // alt + w
	 * inputs.on("ctrlAltShiftH", keydown => {}); // ctrl + alt + shift + h. Must be in this order, but can take out ctrl/alt/shift as needed
	 * inputs.on(" ", keydown => {}); // space is pressed
	 * 
	 * // mouse events
	 * inputs.on("mouse0", mousedown => {}); // left click
	 * inputs.on("mouse1", mousedown => {}); // middle click
	 * inputs.on("mouse2", mousedown => {}); // right click
	 * 
	 */
	on(event, callback) {
		event = event.toLowerCase();
		if (this.isValidKeyEvent(event) || this.isValidMouseEvent(event)) {
			if (!this.#binds[event]) this.#binds[event] = [];
			this.#binds[event.toLowerCase()].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a callback from an event
	 * @param {string} event - Keys pressed in event
	 * @param {Function} callback - Function to unbind
	 */
	off(event, callback) {
		let events = this.#binds[event];
		if (events.includes(callback)) {
			events.splice(events.indexOf(callback), 1);
		}
	}
	/**
	 * Triggers an event, firing all bound callbacks
	 * @param {string} event - Name of the event
	 * @param {...*} args - Arguments passed to callbacks
	 */
	trigger(event, ...args) {
		// Trigger each event
		if (this.#binds[event]) {
			this.#binds[event].forEach(callback => {
				callback(...args);
			});
		}
	}
}
module.exports = Inputs;


/***/ }),

/***/ 769:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);
const Node = __webpack_require__(593);
const Common = __webpack_require__(929);
const Bounds = __webpack_require__(60);

/**
 * A node that detects collisions.
 * It's a child of a RigidBody and collisions detected by the CollisionShape are triggered and solved on the RigidBody
 * @extends Node
 */
class CollisionShape extends Node {
	nodeType = "CollisionShape";
	Engine;
	parent;

	position = new vec(0, 0);
	angle = 0;
	
	_axes = [];
	pairs = [];
	_lastSeparations = {};

	bounds;

	constructor(RigidBody, vertices, Engine) {
		super();
		this.vertices = vertices.map(v => new vec(v));
		this.Engine = Engine;
		this.parentNode = RigidBody;

		// Create bounds
		this.bounds = new Bounds(this.vertices);

		// Reset vertices so convex check works properly
		this.#removeDuplicateVertices();
		this._resetVertices();

		// Fully reset vertices
		this._resetVertices();
	}
	//
	// Public user methods
	//
	/**
	 * Adds the collision shape
	 * @return {CollisionShape} `this`
	 */
	add() {
		super.add();
		return this;
	}

	/**
	 * Removes the collision shape
	 * @return {CollisionShape} `this`
	 */
	delete() {
		if (this.isAdded()) {
			super.delete();

			for (let i = 0; i < this.pairs.length; i++) {
				this.Engine.cleansePair(this.pairs[i]);
			}
		}
		return this;
	}

	/**
	 * Instantly sets body's position to `position`
	 * @param {vec} position - Position the body should be
	 * @example
	 * body.setPosition(new vec(100, 100)); // Sets body's position to (100, 100) 
	 */
	setPosition(position) {
		let delta = position.sub(this.position);
		this.translate(delta);
	}
	/**
	 * Shifts body's position by delta
	 * @param {vec} delta - Distance the body should be shifted
	 */
	translate(delta) {
		if (delta.isNaN() || delta.x === 0 && delta.y === 0) return;
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			vertices[i].add2(delta);
		}

		this.position.add2(delta);
		this.bounds.update(this.vertices);

		let tree = this.Engine.World.dynamicGrid;
		if (this._Grids && this._Grids[tree.id]) {
			tree.updateBody(this);
		}

		let children = this.children;
		for (let child of children) {
			child.translate(delta);
		}
	}
	/**
	 * Rotates the body to `angle` - Absolute
	 * @param {number} angle - Angle body should be in radians
	 * @example
	 * body.setAngle(Math.PI); // Sets body's angle to Pi radians, or 180 degrees 
	 */
	setAngle(angle, pivot) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			this.translateAngle(delta, pivot);
		}
	}

	/**
	 * Rotates the body by `angle`- Relative
	 * @param {number} angle - Amount the body should be rotated, in radians
	 */
	translateAngle(angle, pivot = this.parentNode.rotationPoint.rotate(this.angle + angle).add(this.parentNode.position)) {
		if (isNaN(angle)) return;
		let vertices = this.vertices;

		let sin = Math.sin(angle);
		let cos = Math.cos(angle);

		for (let i = vertices.length; i-- > 0;) {
			let vert = vertices[i];
			let dist = vert.sub(pivot);
			vert.x = this.parentNode.position.x + (dist.x * cos - dist.y * sin);
			vert.y = this.parentNode.position.y + (dist.x * sin + dist.y * cos);
		}

		// let posOffset = rotationPoint.sub(rotationPoint.rotate(angle));
		// this.translate(posOffset);

		this.bounds.update(this.vertices);
		this.#updateAxes();

		super.translateAngle(angle, pivot, false);
	}
	
	/**
	 * Removes overlapping vertices
	 * @param {number} minDist - Minimum distance when points are considered the same
	 */
	#removeDuplicateVertices(minDist = 1) { // remove vertices that are the same
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			
			for (let j = 0; j < vertices.length; j++) {
				if (j === i) continue;
				let nextVert = vertices[j];
				let dist = curVert.sub(nextVert);

				if (Math.abs(dist.x) + Math.abs(dist.y) < minDist) { // just use manhattan dist because it doesn't really matter
					vertices.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}
	/**
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * @private
	 */
	_resetVertices() {
		this.#makeCCW(true);
		this.area = this.#getArea();
		this.#recenterVertices();
		this.bounds.update(this.vertices);
		this.#updateAxes();
	}
	/**
	 * Tries to ensure the body's vertices are counterclockwise winding, by default by comparing the angles of the first 2 vertices and reversing the vertice array if they're clockwise
	 * @param {boolean} force - If all vertices should be completely reordered using their angle from the center
	 */
	#makeCCW(force = false) { // makes vertices go counterclockwise if they're clockwise
		if (force) { // reorders vertices by angle from center - can change order of vertices
			let vertices = this.vertices;
			let center = this.position;
			let mapped = vertices.map(v => [v, v.sub(center).angle]);
			mapped.sort((a, b) => Common.angleDiff(a[1], b[1]));
			this.vertices = mapped.map(v => v[0]);
		}
		else { // reverses vertices if the 1st and 2nd are going wrong direction - never changes order of vertices
			let vertices = this.vertices;
			let center = this.position;
	
			let mapped = vertices.map(v => v.sub(center).angle);
			if (Common.angleDiff(mapped[0], mapped[1]) > 0) {
				this.vertices.reverse();
			}
		}
	}
	/**
	 * Calculates the area of the body if it is convex
	 * @return {number} The area of the body
	 */
	#getArea() {
		let area = 0;
		let vertices = this.vertices;
		let len = vertices.length;
		for (let i = 0; i < len; i++) {
			area += vertices[i].cross(vertices[(i + 1) % len]);
		}
		return area * 0.5;
	}
	/**
	 * Shifts position to be at center of mass of vertices
	 */
	#recenterVertices() {
		let center = this.#getCenterOfMass();
		this.position.set(center);
	}
	/**
	 * Finds the center of mass of the shape, assuming the weight distribution is uniform
	 * @returns {vec} The center of mass
	 */
	#getCenterOfMass() {
		let center = Common.getCenterOfMass(this.vertices);
		return center;
	}
	/**
	 * Calculates the body's axes from its vertices
	 */
	#updateAxes() {
		let verts = this.vertices;
		let axes = [];

		for (let i = 0; i < verts.length; i++) {
			let curVert = verts[i];
			let nextVert = verts[(i + 1) % verts.length];

			axes.push(nextVert.sub(curVert));
		}
		for (let i = 0; i < axes.length; i++) {
			axes[i] = axes[i].normal().normalize2();
		}

		this._axes = axes;
	}
	/**
	 * Finds the vertice farthest in a direction
	 * @param {vec} vector - Normalized direction to find the support point
	 * @param {vec} position - Position to base support on
	 * @return {Array} 
	 * @private
	 */
	_getSupport(vector, position = this.position) {
		let vertices = this.vertices;
		let bestDist = 0;
		let bestVert;
		for (let i = 0; i < vertices.length; i++) {
			let dist = vector.dot(vertices[i].sub(position));

			if (dist > bestDist) {
				bestDist = dist;
				bestVert = i;
			}
		}

		return [ bestVert, bestDist ];
	}
	/**
	 * Finds if a point is inside the body
	 * @param {vec} point - Point to query
	 * @return {boolean} If the point is inside the body's vertices
	 */
	containsPoint(point) {
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVertice = vertices[i];
			let nextVertice = vertices[(i + 1) % vertices.length];
			
			if ((point.x - curVertice.x) * (nextVertice.y - curVertice.y) + (point.y - curVertice.y) * (curVertice.x - nextVertice.x) >= 0) {
				return false;
			}
		}
		return true;
	}
}
module.exports = CollisionShape;


/***/ }),

/***/ 726:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);
const Common = __webpack_require__(929);
const Performance = __webpack_require__(656);
const CollisionShape = __webpack_require__(769);

/**
 * The physics engine
 */
class Engine {
	static defaultOptions = {
		substeps: 6,
		velocityIterations: 1,
		positionIterations: 1,
		constraintIterations: 1,
		maxShare: 1,
	}

	delta = 1;
	substeps = 6;
	velocityIterations = 1;
	positionIterations = 1;
	constraintIterations = 1;
	maxShare = 1;

	/**
	 * 
	 * @param {World} World - World the physics engine should run on
	 * @param {Object} options - Physics options
	 * @param {number} [options.substeps=6] - Number of substeps per tick
	 * @param {number} [options.velocityIterations=1] - Number of velocity solver iterations per tick
	 * @param {number} [options.positionIterations=1] - Number of position solver iterations per tick
	 * @param {number} [options.constraintIterations=1] - Number of constraint solver iterations per tick
	 * @param {number} [options.maxShare=1] - Maximum share of collision impulse a body can have. Not recommended to change
	 */
	constructor(World, options = {}) {
		let defaults = { ...Engine.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		// Shallow copy options
		let mutableProperties = [`substeps`, `velocityIterations`, `positionIterations`, `constraintIterations`, `maxShare`];
		for (let propertyName of mutableProperties) {
			if (options[propertyName] != undefined && typeof this[propertyName] != "function") {
				this[propertyName] = options[propertyName];
			}
		}
		this.World = World;
		this.Performance = new Performance();
	}

	/**
	 * Ticks the engine one frame
	 * @param {number} [delta] - (Optional) Engine tick duration, in seconds
	 */
	update(delta) {
		const { World, Performance, substeps } = this;
		const { rigidBodies } = World;

		// Get delta
		if (delta === undefined) {
			delta = Performance.delta * World.timescale;
		}
		World.time += delta;
		delta /= substeps;
		this.delta = delta;

		// Get timing
		Performance.update();

		for (let step = 0; step < substeps; step++) {
			Performance.frame++;
			
			// Update positions / angles
			for (let body of rigidBodies) {
				body._update(delta);
			}
			
			// Find collisions
			World.globalVectors = [];
			World.globalPoints = [];
			
			const pairs = World.collisionPairs;
			for (let i = 0; i < pairs.length; i++) {
				let [ bodyA, bodyB ] = pairs[i];
				if (this.collides(bodyA, bodyB)) {
					this.createPair(bodyA, bodyB);
				}
			}

			// Apply forces
			for (let body of rigidBodies) {
				body._preUpdate(delta);
			}

			// Solve for velocities
			for (let i = 0; i < this.velocityIterations; i++) {
				this.solveVelocity();
			}
			for (let i = 0; i < this.positionIterations; i++) {
				this.solvePositions();
			}
			this.solveConstraints(delta);
		}

		this.delta = delta * substeps;
	}

	/**
	 * Checks if `bodyA` and `bodyB` are colliding
	 * @param {CollisionShape} bodyA - 1st body to check
	 * @param {CollisionShape} bodyB - 2nd body to check
	 * @return {boolean} If the bodies are colliding
	 */
	collides(bodyA, bodyB) {
		if (bodyA.parentNode.isStatic && bodyB.parentNode.isStatic) return false;

		let collision = true;

		function getAllSupports(body, direction) {
			let vertices = body.vertices;
			let maxDist = -Infinity;
			let minDist = Infinity;
			// let maxVert, minVert;

			for (let i = 0; i < vertices.length; i++) {
				let dist = direction.dot(vertices[i]);

				if (dist > maxDist) {
					maxDist = dist;
					// maxVert = i;
				}
				if (dist < minDist) {
					minDist = dist;
					// minVert = i;
				}
			}

			return { max: maxDist, min: minDist };
		}

		// - find if colliding with SAT
		// ~ reuse last separation axis
		if (bodyA._lastSeparations[bodyB.id]) {
			let axis = bodyA._lastSeparations[bodyB.id];
			let supportsA = getAllSupports(bodyA, axis);
			let supportsB = getAllSupports(bodyB, axis);
			let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

			if (overlap < 0.01) {
				collision = false;
			}
			else {
				delete bodyA._lastSeparations[bodyB.id];
				delete bodyB._lastSeparations[bodyA.id];
			}
		}
		if (collision) { // last separation axis didn't work - try all axes
			// ~ bodyA axes
			for (let j = 0; j < bodyA._axes.length; j++) {
				let axis = bodyA._axes[j];
				let supportsA = getAllSupports(bodyA, axis);
				let supportsB = getAllSupports(bodyB, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

				if (overlap < 0.01) {
					collision = false;
					bodyA._lastSeparations[bodyB.id] = axis;
					bodyB._lastSeparations[bodyA.id] = axis;
					break;
				}
			}
			// ~ bodyB axes
			for (let j = 0; j < bodyB._axes.length; j++) {
				let axis = bodyB._axes[j];
				let supportsA = getAllSupports(bodyB, axis);
				let supportsB = getAllSupports(bodyA, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);
				
				if (overlap < 0) {
					collision = false;
					bodyA._lastSeparations[bodyB.id] = axis;
					bodyB._lastSeparations[bodyA.id] = axis;
					break;
				}
			}
		}
		return collision;
	}

	/**
	 * Creates a collision pair between `bodyA` and `bodyB`
	 * @param {CollisionShape} bodyA - 1st body to pair
	 * @param {CollisionShape} bodyB - 2nd body to pair
	 */
	createPair(bodyA, bodyB) {
		const { World, Performance } = this;
		let minDepth = Infinity;
		let normal;
		let normalPoint;
		let contactBody;
		let normalBody;
		let contacts = [];
		let numContacts = 0;

		// - get collision normal by finding point/edge pair with minimum depth
		function findNormal(bodyA, bodyB) {
			let vertices = bodyA.vertices;
			for (let i = 0; i < vertices.length; i++) {
				let curVertice = vertices[i];
				let nextVertice = vertices[(i + 1) % vertices.length];
				let curNormal = curVertice.sub(nextVertice).normal().normalize();
				let support = bodyB._getSupport(curNormal, curVertice);

				if (bodyB.containsPoint(curVertice)) {
					contacts.push({ vertice: curVertice, body: bodyA });
					numContacts++;
				}

				if (support[1] < minDepth) {
					minDepth = support[1];
					normal = curNormal.mult(-1);
					normalPoint = curVertice.avg(nextVertice);

					normalBody = bodyB;
					contactBody = bodyA;
				}
			}
		}

		findNormal(bodyA, bodyB);
		findNormal(bodyB, bodyA);

		if (contacts.length === 0) {
			contacts.push({ vertice: new vec(bodyA.position), body: bodyA });
		}
		if (normal === undefined) {
			console.error(bodyA, bodyB);
			throw new Error("Could not find normal");
		}

		normal.mult2(-1);
		World.globalVectors.push({ position: normalPoint, vector: new vec(normal) });
		World.globalPoints.push(...contacts.map(v => v.vertice));

		let pairId = Common.pairCommon(bodyA.id, bodyB.id);
		let pair = {
			bodyA: contactBody,
			bodyB: normalBody,
			depth: minDepth,
			penetration: normal.mult(minDepth),
			contacts: contacts,
			totalContacts: numContacts,
			normal: normal,
			tangent: normal.normal(),

			id: pairId,
			frame: Performance.frame,
			start: World.time,
		}

		if (World.pairs[pairId]) { // Collision happened last frame, so it's active
			pair.start = World.pairs[pairId].start;
			bodyA.parentNode.trigger("collisionActive", pair);
			bodyB.parentNode.trigger("collisionActive", pair);

			bodyA.parentNode.trigger("bodyInside", bodyB.parentNode);
			bodyB.parentNode.trigger("bodyInside", bodyA.parentNode);
		}
		else { // No collision between these bodies last frame, so collision just started
			bodyA.parentNode.trigger("collisionStart", pair);
			bodyB.parentNode.trigger("collisionStart", pair);

			bodyA.parentNode.trigger("bodyEnter", bodyB.parentNode);
			bodyB.parentNode.trigger("bodyEnter", bodyA.parentNode);
			
			bodyA.pairs.push(pairId);
			bodyB.pairs.push(pairId);
		}

		World.pairs[pairId] = pair;
	}

	/**
	 * Deletes the collision pair
	 * @param {Object} pair - Pair to delete
	 * @return {boolean} If pair was successfully removed, meaning they are no longer colliding
	 */
	cleansePair(pair) {
		const { Performance, World } = this;
		if (pair.frame < Performance.frame) {
			let { bodyA, bodyB } = pair;

			// Remove pair
			bodyA.pairs.splice(bodyA.pairs.indexOf(pair.id), 1);
			bodyB.pairs.splice(bodyB.pairs.indexOf(pair.id), 1);
			delete World.pairs[pair.id];

			// Trigger collisionEnd event
			bodyA.trigger("collisionEnd", pair);
			bodyB.trigger("collisionEnd", pair);

			bodyA.trigger("bodyExit", bodyB);
			bodyB.trigger("bodyExit", bodyA);

			return true;
		}
		return false;
	}

	/**
	 * Solves velocity constriants on current collision pairs
	 * Also clears collision pairs that are no longer valid (they haven't collided this frame)
	 */
	solveVelocity() {
		let { pairs } = this.World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			if (!pair || this.cleansePair(pair)) continue;

			let { bodyA: collisionShapeA, bodyB: collisionShapeB, normal, tangent, contacts, depth } = pair;
			let bodyA = collisionShapeA.parentNode;
			let bodyB = collisionShapeB.parentNode;

			let numContacts = contacts.length;
			if (numContacts === 0) continue;

			if (bodyA.isSensor || bodyB.isSensor) continue;

			const restitution = 1 + Math.max(bodyA.restitution, bodyB.restitution);
			const relVel = bodyB.velocity.sub(bodyA.velocity);
			const friction = Math.sqrt(bodyA.friction ** 2 + bodyB.friction ** 2);

			if (relVel.dot(normal) < 0) {
				continue;
			}

			let impulse = new vec(0, 0);
			let angImpulseA = 0;
			let angImpulseB = 0;

			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = this.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;

			for (let c = 0; c < numContacts; c++) {
				const { vertice } = contacts[c];

				const offsetA = vertice.sub(bodyA.position);
				const offsetB = vertice.sub(bodyB.position);
				const vrA = bodyA.velocity.add(offsetA.cross(bodyA.angularVelocity));
				const vrB = bodyB.velocity.add(offsetB.cross(bodyB.angularVelocity));
				const relativeVelocity = vrA.sub(vrB);
				const normalVelocity = relativeVelocity.dot(normal);
				const tangentVelocity = relativeVelocity.dot(tangent);

				if (normalVelocity > 0) continue;

				let rnA = offsetA.cross(normal);
				let rnB = offsetB.cross(normal);
				let kNormal = bodyA._inverseMass + bodyB._inverseMass + bodyA._inverseInertia * rnA * rnA + bodyB._inverseInertia * rnB * rnB;

				let share = 1 / (contacts.length * kNormal);
				
				const normalImpulse = normalVelocity * share * 0.5;
				let tangentImpulse = tangentVelocity * share * 0.5;


				// Coulomb Ff <= μFn
				if (Math.abs(tangentImpulse) > Math.abs(normalVelocity) * friction) {
					tangentImpulse = Math.abs(normalImpulse) * Math.sign(tangentImpulse) * friction;
				}

				// const normalMass = (kNormal > 0 ? 1 / kNormal : 0) / contacts.length;
				// const bias = -depth / delta * 0;
				// let normalImpulse = normalMass * (normalVelocity + bias) * 0.4 * restitution;
				
				// float bias = separation / delta
				// float impulse = -cp->normalMass * 1 * (vn + bias) - impulseScale * cp->normalImpulse;

				/*
				// Compute normal impulse
				float impulse = -cp->normalMass * massScale * (vn + bias) - impulseScale * cp->normalImpulse;

				// Clamp the accumulated impulse
				float newImpulse = S2_MAX(cp->normalImpulse + impulse, 0.0f);
				impulse = newImpulse - cp->normalImpulse;
				cp->normalImpulse = newImpulse;

				// Apply contact impulse
				s2Vec2 P = s2MulSV(impulse, normal);
				vA = s2MulSub(vA, mA, P);
				wA -= iA * s2Cross(rA, P);

				vB = s2MulAdd(vB, mB, P);
				wB += iB * s2Cross(rB, P);
				*/

				const curImpulse = normal.mult(normalImpulse * restitution).add2(tangent.mult(tangentImpulse));
				impulse.add2(curImpulse);
				angImpulseA += offsetA.cross(curImpulse) * bodyA._inverseInertia;
				angImpulseB += offsetB.cross(curImpulse) * bodyB._inverseInertia;
			}
			
			if (!bodyA.isStatic) {
				bodyA.velocity.sub2(impulse.mult(bodyA._inverseMass));
				bodyA.angularVelocity -= angImpulseA * bodyA._inverseMass;
			}
			if (!bodyB.isStatic) {
				bodyB.velocity.add2(impulse.mult(bodyB._inverseMass));
				bodyB.angularVelocity += angImpulseB * bodyB._inverseMass;
			}
		}
	}
	
	/**
	 * Solves position intersections between bodies based on their collision pairs
	 */
	solvePositions() {
		const { World } = this;
		let { pairs } = World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			let { depth, bodyA: collisionShapeA, bodyB: collisionShapeB, normal } = pair;
			let bodyA = collisionShapeA.parentNode;
			let bodyB = collisionShapeB.parentNode;
			
			if (bodyA.isSensor || bodyB.isSensor) continue;
			if (depth < 1) continue;

			let impulse = normal.mult(depth - 1);
			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = this.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;

			if (!bodyA.isStatic) {
				let a = impulse.mult(shareA * 1 / collisionShapeA.pairs.length);
				bodyA.translate(a)
			}
			if (!bodyB.isStatic) {
				let a = impulse.mult(-shareB * 1 / collisionShapeB.pairs.length);
				bodyB.translate(a)
			}
			pair.depth -= impulse.length;
		}
	}

	/**
	 * Solves physics constraints for their new position and velocity
	 * @param {number} delta - Engine tick duration, in seconds
	 */
	solveConstraints(delta) {
		delta *= 1000;
		const constraints = this.World.constraints;
		const constraintIterations = this.constraintIterations;
		delta /= constraintIterations;

		for (let step = 0; step < constraintIterations; step++) {
			for (let i = 0; i < constraints.length; i++) {
				let constraint = constraints[i];
				let { bodyA, bodyB, offsetA, offsetB, stiffness, angularStiffness, length, ignoreSlack } = constraint;
				let pointA = bodyA.position.add(offsetA.rotate(bodyA.angle));
				let pointB = bodyB.position.add(offsetB.rotate(bodyB.angle));

				// constraint velocity solver
				let diff = pointA.sub(pointB);
				let normal = diff.normalize();
				let tangent = normal.normal();

				let totalMass = bodyA.mass + bodyB.mass;
				let shareA = (bodyB.mass / totalMass) || 0;
				let shareB = (bodyA.mass / totalMass) || 0;
				let maxShare = this.maxShare;
				shareA = Math.min(maxShare, shareA);
				shareB = Math.min(maxShare, shareB);
				if (bodyA.isStatic) shareB = 1;
				if (bodyB.isStatic) shareA = 1;

				function solveImpulse(vertice, point, body) { // vertice = where the constraint goes to, point = where the constraint is
					let offset = point.sub(body.position);
					let offsetLen = offset.length;
					if (offsetLen > length * 3) {
						offset.mult2(length / offsetLen);
					}
					const vp1 = body.velocity.add(offset.normal().mult(-body.angularVelocity));
					const vp2 = vertice.sub(point).mult(stiffness * 30);
					if (ignoreSlack && diff.length < length * (1 + stiffness)) { // idk how to get this to work
						vp1.mult2(0);
						vp2.mult2(0);
					}
					const relativeVelocity = vp1.sub(vp2);
					const normalVelocity = relativeVelocity.dot(normal);
					const tangentVelocity = relativeVelocity.dot(tangent);
					let tangentImpulse = tangentVelocity;
					
					let normalImpulse = (stiffness) * normalVelocity; // min is to prevent breakage
					normalImpulse = Math.min(Math.abs(normalImpulse), 300) * Math.sign(normalImpulse);
					let curImpulse = normal.mult(normalImpulse).add2(tangent.mult(tangentImpulse * angularStiffness));

					return {
						angularImpulse: offset.cross(curImpulse) * body._inverseInertia / 2,
						normalImpulse: curImpulse.mult(0.5),
					}
				}

				let impulseDiff = pointA.sub(pointB).normalize().mult(length);
				let impulsePtA = bodyA.isStatic ? pointA : pointB.add(impulseDiff);
				let impulsePtB = bodyB.isStatic ? pointB : pointA.sub(impulseDiff);

				let { angularImpulse: angImpulseA, normalImpulse: impulseA } = solveImpulse(impulsePtA, pointA, bodyA);
				let { angularImpulse: angImpulseB, normalImpulse: impulseB } = solveImpulse(impulsePtB, pointB, bodyB);
				
				if (!bodyA.isStatic) {
					bodyA.velocity.sub2(impulseA.mult(shareA * delta));
					bodyA.angularVelocity -= angImpulseA * shareA * delta;
				}
				if (!bodyB.isStatic) {
					bodyB.velocity.sub2(impulseB.mult(shareB * delta));
					bodyB.angularVelocity -= angImpulseB * shareB * delta;
				}

				// constraint position solver
				// let nextLength = pointA.sub(pointB).length + (length - pointA.sub(pointB).length) * stiffness;
				// let changeA = nextLength - impulsePtB.sub(bodyA.position).length;
				// changeA = Math.min(50, Math.abs(changeA)) * Math.sign(changeA);
				// let changeB = nextLength - impulsePtA.sub(bodyB.position).length;
				// changeB = Math.min(50, Math.abs(changeB)) * Math.sign(changeB);

				// bodyA.translate(normal.mult((changeA) * shareA * delta * 0.05));
				// bodyB.translate(normal.mult((changeB) * shareB * delta * 0.05));

				constraint.updateBounds();
			}

		}
	}
};
module.exports = Engine;


/***/ }),

/***/ 301:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);
const Node = __webpack_require__(593);
const Common = __webpack_require__(929);
const PolygonRender = __webpack_require__(219);
const Sprite = __webpack_require__(416);
const Spritesheet = __webpack_require__(281)
const Bezier = __webpack_require__(506);
const CollisionShape = __webpack_require__(769);
const decomp = __webpack_require__(371);

/**
 * A rigid body with physics
 * @extends Node
 */
class RigidBody extends Node {
	static defaultOptions = { // not used, but consistent with other classes for documentation
		mass: 1,
		restitution: 0.2,
		frictionAir: 0.05,
		frictionAngular: 0.01,
		friction: 0.5,
		round: 0,
		roundQuality: 40,
	
		isStatic: false,
		isSensor: false,
		hasCollisions: true,
		collisionFilter: {
			layer: 0xFFFFFF,
			mask: 0xFFFFFF,
		},
	}
	/**
	 * @private
	 * Rounds corners on an array of vertices
	 * @param {Array} vertices - Array of `vec` vertices to round
	 * @param {number} round - Amount of rounding
	 * @param {number} dx - Quality of round, lower value means higher quality
	 */
	static roundVertices(vertices, round, dx = 40) {
		let newVertices = [];
		let verticesLength = vertices.length;
		for (let i = 0; i < verticesLength; i++) {
			let prev = vertices[(i - 1 + verticesLength) % verticesLength];	
			let cur = vertices[i];	
			let next = vertices[(i + 1) % verticesLength];	

			// get vectors
			let prevToCur = cur.sub(prev);
			let curToNext = next.sub(cur);
			let prevCurNormalized = prevToCur.normalize();
			let curNextNormalized = curToNext.normalize();

			// get round amount
			let prevRound = Math.min(round, prevToCur.length / 2);
			let nextRound = Math.min(round, curToNext.length / 2);
			let curRound = Math.min(prevRound, nextRound);

			let start = prevCurNormalized.mult(-curRound).add(cur);
			let cp1 = prevCurNormalized.mult(-curRound * 0.45).add(cur);
			let cp2 = curNextNormalized.mult(curRound *  0.45).add(cur);
			let end = curNextNormalized.mult(curRound).add(cur);
			let bezier = new Bezier(start, cp1, cp2, end);
			for (let i = 0; i < bezier.length;) {
				newVertices.push(bezier.get(i));
				i += dx;
			}
			newVertices.push(end);
		}
		return newVertices;
	}

	//
	// Public user options
	//
	nodeType = "RigidBody";
	vertices = [];

	mass = 1;
	restitution = 0.5;
	frictionAir = 0.05;
	frictionAngular = 0.01;
	friction = 0.1;
	round = 0;
	roundQuality = 40;

	isStatic = false;
	isSensor = false;
	hasCollisions = true;
	collisionFilter = {
		layer: 0xFFFFFF,
		mask: 0xFFFFFF,
	}

	/**
	 * Creates a new RigidBody
	 * @param {Engine} Engine - Engine the body should be simulated in
	 * @param {Array} vertices - Array of `vec` representing the body's vertices
	 * @param {vec} position - Position of the body
	 * @param {Object} options - RigidBody options
	 * @example
	 * // Includes all RigidBody options
	 * new RigidBody(Engine, [new vec(0, 0), new vec(10, 0), new vec(10, 10), new vec(0, 10)], new vec(0, 0), {
	 * 	mass: 1,
	 * 	restitution: 0.5,
	 * 
	 * 	frictionAir: 0.05,
	 * 	frictionAngular: 0.01,
	 * 	friction: 0.01,
	 * 
	 * 	round: 0,
	 * 	roundQuality: 40,
	 * 
	 * 	isStatic: false,
	 * 	isSensor: false,
	 * 	hasCollisions: true,
	 * 	collisionFilter: {
	 * 		layer: 0xFFFFFF,
	 * 		mask: 0xFFFFFF,
	 * 	},
	 * });
	 */
	constructor(Engine, vertices, position, options = {}) {
		super();
		position = new vec(position);
		if (!this.Engine) this.Engine = Engine;
		
		// Shallow copy World
		this.World = this.Engine.World;
		delete options.World;

		// Shallow copy render
		if (options.render) {
			this.addChild(options.render);
			delete options.render;
		}

		// Merge collision filters
		if (typeof options.collisionFilter === "object") Common.merge(this.collisionFilter, options.collisionFilter, 1);

		// Merge options with body
		Common.merge(this, options, 1);
		
		// Parse collision filter properties
		for (let filterType in ["layer", "mask"]) {
			if (typeof this.collisionFilter[filterType] === "string") {
				this.collisionFilter[filterType] = parseInt(this.collisionFilter[filterType], 2);
			}
		}

		// Convert vertices to vec
		this.vertices = vertices.map(v => new vec(v));
		
		// round vertices
		if (options.round && options.round > 0) {
			this.vertices = RigidBody.roundVertices(this.vertices, this.round, this.roundQuality);
		}

		// Reset vertices so convex check works properly
		this.#removeDuplicateVertices();
		this._resetVertices();

		let allVertices = [this.vertices];
		if (!this.#isConvex()) {
			allVertices = this.#getConvexVertices();
		}

		for (let vertices of allVertices) {
			let collisionShape = new CollisionShape(this, vertices, this.Engine);
			this.addChild(collisionShape);
		}

		// Fully reset vertices
		this._resetVertices();
		this._updateInertia();

		// Set mass
		this._inverseMass = 1 / this.mass;

		// Set angle from options
		if (options.angle) {
			this.angle = 0;
			this.setAngle(options.angle);
		}
		this.setPosition(position);
	}
	
	//
	// Public user methods
	//
	/**
	 * Adds the collision shape to its world
	 * @return {RigidBody} `this`
	 */
	add() {
		let World = this.Engine.World;
		if (!this.isAdded()) {
			super.add();
			World.addChild(this);
		}
		return this;
	}

	/**
	 * Removes the collision shape from its world
	 * @return {RigidBody} `this`
	 */
	delete() {
		let World = this.Engine.World;
		if (this.isAdded()) {
			super.delete();
			World.removeChild(this);
		}
		return this;
	}

	/**
	 * Adds a polygon render to body
	 * @param {PIXI.Container} container - Container polygon render is added to
	 * @param {Object} options - (Polygon Render)[./PolygonRender.html] options
	 * @return {RigidBody} `this`
	 * @example
	 * body.addPolygonRender(Render.app.stage, {
	 * 	layer: 0, // number
	 * 	subtype: "polygon", // "polygon" | "rectangle" | "circle"
	 * 
	 * 	visible: true,
	 * 	alpha: 1,
	 * 	background: "transparent",
	 * 	border: "transparent",
	 * 	borderWidth: 3,
	 * 	borderOffset: 0.5,
	 * 	lineCap: "butt",
	 * 	lineJoin: "miter",
	 * 
	 * 	// subtype = "rectangle" only options
	 * 	width: 100,
	 * 	height: 100,
	 * 	round: 0,
	 * 
	 * 	// subtype = "circle" only options
	 * 	radius: 50,
	 * })
	 */
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		this.polygonRender = render;
		
		return this;
	}

	/**
	 * Adds a sprite to body
	 * @param {PIXI.Container} container - Container the Sprite is added to
	 * @param {Object} options - (Sprite)[./Sprite.html] options
	 * @return {RigidBody} `this`
	 * @example
	 * body.addSprite(Render.app.stage, {
	 * 	layer: 0, // number
	 * 
	 * 	visible: true,
	 * 	alpha: 1, // number between [0, 1]
	 * 	src: "path/to/sprite.png",
	 * 	
	 * 	scale: new vec(1, 1),
	 * 	width:  undefined, // number
	 * 	height: undefined, // number
	 * });
	 */
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		this.sprite = render;
		
		return this;
	}
	/**
	 * Adds a new Spritesheet to body
	 * @param {PIXI.Container} container - Container the Spritesheet is added to
	 * @param {Object} options - (Spritesheet)[./Spritesheet.html] options
	 * @return {RigidBody} `this`
	 */
	addSpritesheet(container, options) {
		let render = new Spritesheet({
			container: container,
			position: new vec(this.position),
			angle: this.angle,
			
			...options
		});
		this.spritesheet = render;
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}
	
	/**
	 * Changes if the body is static
	 * @param {boolean} isStatic - If the body should be static
	 */
	setStatic(isStatic) {
		let { dynamicGrid, staticGrid } = this.Engine.World;
		let lastStatic = this.isStatic;
		if (isStatic === lastStatic) return;
		
		this.isStatic = isStatic;
		this.mass = Infinity;
		this.inertia = Infinity;
		this._inverseMass = 0;
		this._inverseInertia = 0;

		if (this.hasCollisions && this.isAdded()) {
			if (lastStatic) {
				staticGrid.removeBody(this);
			}
			else {
				dynamicGrid.removeBody(this);
			}

			if (isStatic) {
				staticGrid.addBody(this);
			}
			else {
				dynamicGrid.addBody(this);
			}
		}
	}

	/**
	 * Changes if the body can collide with other bodies
	 * @param {boolean} hasCollisions - Whether the body can collide with other bodies
	 */
	setCollisions(hasCollisions) {
		let { dynamicGrid, staticGrid } = this.Engine.World;
		if (hasCollisions === this.hasCollisions) return;

		this.hasCollisions = hasCollisions;

		if (this.hasCollisions) {
			if (this.isStatic) {
				staticGrid.addBody(this);
			}
			else {
				dynamicGrid.addBody(this);
			}
		}
		else {
			if (this.isStatic) {
				staticGrid.removeBody(this);
			}
			else {
				dynamicGrid.removeBody(this);
			}
		}
	}

	/**
	 * Finds if a point is inside the body's collision shapes
	 * @param {vec} point - Point to query
	 * @return {boolean} If the point is inside the body's vertices
	 */
	containsPoint(point) {
		for (let child of this.children) {
			if (child instanceof CollisionShape && child.containsPoint(point)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Instantly sets body's position to `position`
	 * @param {vec} position - Position the body should be
	 * @example
	 * body.setPosition(new vec(100, 100)); // Sets body's position to (100, 100) 
	 */
	setPosition(position) {
		let delta = position.sub(this.position);
		this.translate(delta);
	}

	/**
	 * Instantly changes the body's velocity to a specific value
	 * @param {vec} velocity - Velocity the body should have
	 */
	setVelocity(velocity) {
		if (velocity.isNaN()) {
			console.error(velocity);
			throw new Error("Invalid velocity");
		}
		if (this.isStatic) return;
		this.velocity.set(velocity);
	}

	/**
	 * Instantly changes the body's angular velocity to a specific value
	 * @param {number} velocity - Angular velocity the body should have
	 */
	setAngularVelocity(velocity) {
		if (isNaN(velocity)) {
			console.error(velocity);
			throw new Error("Invalid angular velocity");
		}
		if (this.isStatic) return;
		this.angularVelocity = velocity;
	}

	/**
	 * Applies a force to the body, ignoring mass. The body's velocity changes by force * delta
	 * @param {vec} force - Amount of force to be applied, in px / sec^2
	 * @param {number} delta=Engine.delta - Amount of time that the force should be applied in seconds, set to 1 if only applying in one instant
	 */
	applyForce(force, delta = this.Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (force.isNaN()) return;
		if (this.isStatic) return;
		this.force.add2(force.mult(delta));
	}
	
	/**
	 * Applies a rotational force (torque) to the body, ignoring mass. The body's angular velocity changes by force * delta
	 * @param {number} force - Amount of torque to be applied, in radians / sec^2
	 * @param {number} delta - Amount of time the force should be applied in seconds, set to 1 if only applying instantaneous force
	 */
	applyTorque(force, delta = this.Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (isNaN(force)) return;
		this.torque += force * delta;
	}

	// 
	// Private engine variables
	// 
	Engine;

	position = new vec(0, 0);
	velocity = new vec(0, 0);
	angle = 0;
	angularVelocity = 0;
	_last = {
		velocity: new vec(0, 0),
		angularVelocity: 0,
	};
	
	force = new vec(0, 0);
	impulse = new vec(0, 0);
	torque = 0;
	
	rotationPoint = new vec(0, 0);

	_inverseMass = 1;
	inertia = 1;
	_inverseInertia = 0.000015;	

	#events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],

		bodyEnter: [],
		bodyInside: [],
		bodyExit: [],
		
		beforeUpdate: [], // use to apply forces to current body
		duringUpdate: [], // use to clear forces from current body
		
		add: [],
		delete: [],
	}
	/**
	 * Bind a callback to an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Callback run when event is fired
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a callback from an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Function to unbind
	 */
	off(event, callback) {
		let events = this.#events[event];
		if (events.includes(callback)) {
			events.splice(events.indexOf(callback), 1);
		}
	}
	/**
	 * Triggers an event, firing all bound callbacks
	 * @param {string} event - Name of the event
	 * @param {...*} args - Arguments passed to callbacks
	 */
	trigger(event, ...args) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback(...args);
			});
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}

	// 
	// Private engine methods
	// 
	/**
	 * Prepares the body 
	 * @param {number} delta - Engine tick duration, in seconds
	 * @private
	 */
	_preUpdate(delta) {
		this.trigger("beforeUpdate");

		if (this.isStatic) return;

		// apply forces
		this.velocity.add2(this.force).add2(this.Engine.World.gravity.mult(delta));
		this.angularVelocity += this.torque;

		// clear forces
		this.force.x = 0;
		this.force.y = 0;
		this.torque = 0;
	}
	/**
	 * Updates this body's velocity, position, and grid
	 * @param {number} delta - Engine tick duration, in seconds
	 * @private
	 */
	_update(delta) {
		this.trigger("duringUpdate");

		if (this.isStatic) return;

		const timescale = delta;
		let { velocity: lastVelocity, angularVelocity: lastAngularVelocity } = this._last;

		let frictionAir = (1 - this.frictionAir) ** timescale;
		let frictionAngular = (1 - this.frictionAngular) ** timescale;

		if (isNaN(timescale) || this.velocity.isNaN() || isNaN(frictionAir + frictionAngular)) {
			return;
		}
		
		this.velocity.mult2(frictionAir);
		if (this.velocity.x !== 0 || this.velocity.y !== 0){
			this.translate(this.velocity.add(lastVelocity).mult(timescale / 2)); // trapezoidal rule to take into account acceleration
		}
		this._last.velocity.set(this.velocity);

		this.angularVelocity *= frictionAngular;
		if (this.angularVelocity){
			let angleChange = (this.angularVelocity + lastAngularVelocity) * timescale / 2; // trapezoidal rule to take into account acceleration
			let pivot = this.rotationPoint.rotate(this.angle + angleChange).add(this.position);
			this.translateAngle(angleChange, pivot, false);
		}
		this._last.angularVelocity = this.angularVelocity;

		if (this.hasCollisions) {
			for (let child of this.children) {
				if (child instanceof CollisionShape) {
					this.Engine.World.dynamicGrid.updateBody(child);
				}
			}
		}
	}

	/**
	 * Calculates the area of the body if it is convex
	 * @return {number} The area of the body
	 */
	#getArea() {
		let area = 0;
		let vertices = this.vertices;
		let len = vertices.length;
		for (let i = 0; i < len; i++) {
			area += vertices[i].cross(vertices[(i + 1) % len]);
		}
		return area * 0.5;
	}
	/**
	 * Removes overlapping vertices
	 * @param {number} minDist - Minimum distance when points are considered the same
	 */
	#removeDuplicateVertices(minDist = 1) { // remove vertices that are the same
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			
			for (let j = 0; j < vertices.length; j++) {
				if (j === i) continue;
				let nextVert = vertices[j];
				let dist = curVert.sub(nextVert);

				if (Math.abs(dist.x) + Math.abs(dist.y) < minDist) { // just use manhattan dist because it doesn't really matter
					vertices.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}

	/**
	 * Calculates inertia from the body's vertices
	 * @return {number} The body's inertia
	 */
	#getInertia() {
		const { vertices, mass } = this;

		if (this.isStatic) return Infinity;
		
		let numerator = 0;
		let denominator = 0;

		for (var i = 0; i < vertices.length; i++) {
			let j = (i + 1) % vertices.length;
			let cross = Math.abs(vertices[j].cross(vertices[i]));
			numerator += cross * (vertices[j].dot(vertices[j]) + vertices[j].dot(vertices[i]) + vertices[i].dot(vertices[i]));
			denominator += cross;
		}

		return (mass / 6) * (numerator / denominator);
	}
	/**
	 * Sets the inertia of the body to what's calculated in `#getInertia()` if the body is not static
	 * @private
	 */
	_updateInertia() {
		if (this.isStatic) {
			this.mass = Infinity;
			this.inertia = Infinity;
			this._inverseMass = 0;
			this._inverseInertia = 0;
		}
		else {
			this.inertia = this.#getInertia();
			this._inverseInertia = 1 / this.inertia;
		}
	}

	/**
	 * Determines if the body is convex
	 * @return {boolean} If the body is convex
	 */
	#isConvex() {
		let vertices = this.vertices;
		let len = vertices.length;

		let last = vertices[0].sub(vertices[1]);
		let sign = 0;
		for (let i = 1; i < len; i++) {
			let cur = vertices[i].sub(vertices[(i + 1) % len]);
			let curSign = Math.sign(cur.cross(last));

			if (sign === 0) {
				sign = curSign;
			}
			else if (curSign !== 0) {
				if (sign !== curSign) {
					return false;
				}
			}
			last = cur;
		}

		return true;
	}
	/**
	 * Decomposes concave vertices into convex shapes
	 * @returns {Array<vec>} set of convex shapes
	 */
	#getConvexVertices() {
		let convexShapes = [];
		let vertices = this.vertices;
		let decompVerts = vertices.map(v => v.toArray());
		decomp.makeCCW(decompVerts);
		let concaveVertices = decomp.quickDecomp(decompVerts);
		for (let i = 0; i < concaveVertices.length; i++) {
			convexShapes.push(concaveVertices[i].map(v => new vec(v)));
		}
		return convexShapes;
	}

	#getCenterOfMass() {
		let center = Common.getCenterOfMass(this.vertices);
		return center;
	}

	/**
	 * Shifts vertices so their center is at the body's position
	 */
	#recenterVertices() {
		let center = this.#getCenterOfMass();
		let position = this.position;
		center.sub2(position);
		
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].sub2(center);
		}
	}

	/**
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * @param {boolean} forceCCW - If vertices should be forced to be counterclockwise winding by sorting their angles from the center
	 * @private
	 */
	_resetVertices(forceCCW = false) {
		this.#makeCCW(forceCCW);
		this.area = this.#getArea();
		this.#recenterVertices();
	}

	/**
	 * Tries to ensure the body's vertices are counterclockwise winding, by default by comparing the angles of the first 2 vertices and reversing the vertice array if they're clockwise
	 * @param {boolean} force - If all vertices should be completely reordered using their angle from the center
	 */
	#makeCCW(force = false) { // makes vertices go counterclockwise if they're clockwise
		if (force) { // reorders vertices by angle from center - can change order of vertices
			let vertices = this.vertices;
			let center = this.position;
			let mapped = vertices.map(v => [v, v.sub(center).angle]);
			mapped.sort((a, b) => Common.angleDiff(a[1], b[1]));
			this.vertices = mapped.map(v => v[0]);
		}
		else { // reverses vertices if the 1st and 2nd are going wrong direction - never changes order of vertices
			let vertices = this.vertices;
			let center = this.position;
	
			let mapped = vertices.map(v => v.sub(center).angle);
			if (Common.angleDiff(mapped[0], mapped[1]) > 0) {
				this.vertices.reverse();
			}
		}
	}

}
module.exports = RigidBody;


/***/ }),

/***/ 458:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);
const Animation = __webpack_require__(847);
const { angleDiff } = __webpack_require__(929);

/**
 * Handles the game's camera
 */
class Camera {
	/**
	 * Position of the camera
	 * @readonly
	 * @type {vec}
	 */
	position = new vec(0, 0);
	/**
	 * Field of view
	 * @readonly
	 * @type {number}
	 */
	fov = 2000;
	translation = new vec(0, 0);
	scale = 1;
	boundSize = 1000;

	/**
	 * Creates a new camera object used by [Render](./Render.html)
	 * @param {number} fov - Field of view, how much you can see
	 */
	constructor(fov = 2000) {
		this.fov = fov;
	}

	/**
	 * Sets the camera position
	 * @param {vec} position - New position
	 */
	setPosition(position) {
		this.position.set(position);
	}

	/**
	 * Sets the camera's FOV
	 * @param {number} fov - New field of view
	 */
	setFov(fov) {
		this.fov = fov;
	}

	// ~ Point transformations
	screenPtToGame(point) {
		const scale =  this.scale;
		return new vec((point.x - this.translation.x) / scale, (point.y - this.translation.y) / scale);
	}
	gamePtToScreen(point) {
		return new vec((point.x * this.scale + this.translation.x), (point.y * this.scale + this.translation.y));
	}

	/**
	 * 
	 * @param {number} [intensity] - How much the camera shakes
	 * @param {number} [duration] - How long the camera shakes, in seconds
	 * @param {function} [intensityCurve] - Animation curve, see (Animation)[./Animation.html] for ease options
	 * @param {vec|undefined} direction - Direction of the camera shake. Shakes in all directions if left undefined
	 */
	async shake(intensity = 30, duration = 1, intensityCurve = Animation.ease.out.cubic, direction = undefined) {
		if (direction) {
			direction?.normalize2();
			direction.y *= -1;
		}

		let shakeDuration = 0.01; // duration of individual shakes
		let curIntensity = intensity;

		let intensityAnimation = new Animation({
			duration: duration,
			curve: intensityCurve,
			ontick: p => {
				curIntensity = intensity * (1 - p);
				shakeDuration = 0.01 + 0.05 * p;
			}
		});
		intensityAnimation.run();

		function getAngle(prevAngle) {
			if (direction) {
				return direction.mult(-Math.sign(direction.dot(new vec(prevAngle)))).angle;
			}
			else {
				return (angleDiff(prevAngle, Math.random() * Math.PI + Math.PI) + Math.PI * 2) % Math.PI * 2;
			}
		}
		
		let delta = new vec(0, 0);
		let lastAngle = getAngle(Math.random() * Math.PI * 2);
		while (intensityAnimation.isRunning() && duration - intensityAnimation.getTime() > shakeDuration) {
			let curDuration = shakeDuration;
			let angle = getAngle(lastAngle);
			lastAngle = angle;
			let nextDelta = new vec(Math.cos(angle) * curIntensity, Math.sin(angle) * curIntensity);
			let lastDelta = new vec(delta);
			let deltaDelta = nextDelta.sub(lastDelta); // trust me this isn't acceleration
			await new Animation({
				duration: curDuration,
				curve: Animation.ease.linear,
				ontick: p => {
					this.position.sub2(delta);
					delta.set(deltaDelta.mult(p).add(lastDelta));
					this.position.add2(delta);
				},
			}).run();
		}
		let lastDelta = new vec(delta);
		let deltaDelta = delta.mult(-1);
		await new Animation({
			duration: shakeDuration,
			curve: Animation.ease.linear,
			ontick: p => {
				this.position.sub2(delta);
				delta.set(deltaDelta.mult(p).add(lastDelta));
				this.position.add2(delta);
			},
		}).run();
	}
};
module.exports = Camera;


/***/ }),

/***/ 334:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Game = __webpack_require__(830);
const CollisionShape = __webpack_require__(769);

/**
 * Extra functions for debugging, such as showing all vertices, hitboxes, and collisions.
 */
class DebugRender {
	// - Debug rendering
	canvas = null;
	ctx = null;

	/**
	 * What is rendered
	 * - **enabled.vertices** - Shows wireframes of all physics bodies
	 * - **enabled.collisions** - Shows collision points and normals
	 * - **enabled.boundingBox** - Shows AABB bounding boxes for physics bodies
	 * - **enabled.centers** - Shows center of mass of all physics bodies
	 * - **enabled.broadphase** - Shows active non-static broadphase grids cells
	 * @type {object}
	 * @todo Add methods for setting these, possibly also in Game
	 * @example
	 * myGame.DebugRender.enabled.vertices = true; // Vertice rendering
	 * myGame.DebugRender.enabled.collisions = true; // Collision rendering
	 * myGame.DebugRender.enabled.boundingBox = true; // Bounding box rendering
	 * myGame.DebugRender.enabled.centers = true; // Center rendering
	 * myGame.DebugRender.enabled.broadphase = true; // Broadphase rendering
	 */
	enabled = {
		vertices: false,
		centers: false,
		collisions: false,
		broadphase: false,
		boundingBox: false,
	}

	/**
	 * Creates a debug rendering context for the game.
	 * @param {Game} Game - Game to render debug info for
	 */
	constructor(Game) {
		this.Game = Game;

		let baseCanvas = Game.Render.app.view;
		let scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = 1;
		canvas.style.top =  "0px";
		canvas.style.left = "0px";
		canvas.width  = baseCanvas.width;
		canvas.height = baseCanvas.height;
		canvas.style.background = "transparent";
		canvas.style.pointerEvents = "none";
		canvas.style.transformOrigin = "top left";
		canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		baseCanvas.parentNode.appendChild(canvas);

		Game.Render.app.renderer.on("resize", (width, height) => {
			let scale = devicePixelRatio ?? 1;
			canvas.width  = width  * scale;
			canvas.height = height * scale;
			canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		});

		this.update = this.update.bind(this);
		Game.Render.app.ticker.add(this.update);
	}
	update() {
		let { ctx, canvas, enabled, Game } = this;
		const { Render } = Game;
		const { camera, pixelRatio } = Render;
		let canvWidth = canvas.width;
		let canvHeight = canvas.height;
		
		const { position:cameraPosition } = camera;
		const scale = camera.scale * pixelRatio;
		let translation = new vec({ x: -cameraPosition.x * scale + canvWidth/2, y: -cameraPosition.y * scale + canvHeight/2 });

		ctx.clearRect(0, 0, canvWidth, canvHeight);
		ctx.save();
		ctx.translate(translation.x, translation.y);
		ctx.scale(scale, scale);

		for (let debugType in enabled) {
			if (enabled[debugType] && typeof this[debugType] === "function") {
				this[debugType]();
			}
		}

		ctx.restore();
	}

	
	vertices() {
		const { Game, ctx } = this;
		const { camera, pixelRatio } = Game.Render;
		const scale = camera.scale * pixelRatio;

		function renderVertices(vertices) {
			ctx.moveTo(vertices[0].x, vertices[0].y);

			for (let j = 0; j < vertices.length; j++) {
				if (j > 0) {
					let vertice = vertices[j];
					ctx.lineTo(vertice.x, vertice.y);
				}
			}

			ctx.closePath();
		}

		ctx.beginPath();
		let allBodies = Game.World.rigidBodies;
		for (let body of allBodies) {
			for (let child of body.children) {
				if (child instanceof CollisionShape) {
					renderVertices(child.vertices);
				}
			}
		}
		ctx.lineWidth = 2 / scale;
		ctx.strokeStyle = "#DF7157";
		ctx.stroke();
	}
	collisions() {
		const { ctx, Game } = this;
		const { globalPoints, globalVectors } = Game.World;
		
		if (globalPoints.length > 0) { // Render globalPoints
			ctx.beginPath();
			for (let i = 0; i < globalPoints.length; i++) {
				let point = globalPoints[i];
				ctx.moveTo(point.x, point.y);
				ctx.arc(point.x, point.y, 2.5 / camera.scale, 0, Math.PI*2);
				ctx.fillStyle = "#e8e8e8";
			}
			ctx.fill();
		}
		if (globalVectors.length > 0) { // Render globalVectors
			ctx.beginPath();
			for (let i = 0; i < globalVectors.length; i++) {
				let point = globalVectors[i].position;
				let vector = globalVectors[i].vector;
				ctx.moveTo(point.x, point.y);
				ctx.lineTo(point.x + vector.x * 10 / camera.scale, point.y + vector.y * 10 / camera.scale);
				ctx.strokeStyle = "#DF7157";
				ctx.lineWidth = 3 / camera.scale;
			}
			ctx.stroke();
		}
	}
	centers() {
		const { ctx, Game } = this;
		const { camera } = Game.Render;
		ctx.fillStyle = "#DF7157";
		let allBodies = Game.World.rigidBodies;
		ctx.beginPath();
		for (let body of allBodies) {
			ctx.moveTo(body.position.x, body.position.y);
			ctx.arc(body.position.x, body.position.y, 2 / camera.scale, 0, Math.PI*2);
		}
		ctx.fill();
	}
	boundingBox() {
		const { ctx, Game } = this;
		const { World, Render } = Game;
		const { camera } = Render;
		let allBodies = World.rigidBodies;
		let allConstraints = World.constraints;

		ctx.strokeStyle = "#66666680";
		ctx.lineWidth = 1 / camera.scale;

		for (let body of allBodies) {
			for (let child of body.children) {
				if (child instanceof CollisionShape) {
					let bounds = child.bounds;
					let width  = bounds.max.x - bounds.min.x;
					let height = bounds.max.y - bounds.min.y;
		
					ctx.beginPath();
					ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
				}
			}
		}
		ctx.strokeStyle = "#66666630";
		for (let constraint of allConstraints) {
			let bounds = constraint.bounds;
			let width  = bounds.max.x - bounds.min.x;
			let height = bounds.max.y - bounds.min.y;

			ctx.beginPath();
			ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
		}
	}
	broadphase(tree = this.Game.World.dynamicGrid) {
		const { ctx, Game } = this;
		const { camera } = Game.Render;
		let size = tree.gridSize;

		ctx.lineWidth = 0.4 / camera.scale;
		ctx.strokeStyle = "#D0A356";
		ctx.fillStyle = "#947849";
		
		Object.keys(tree.grid).forEach(n => {
			let node = tree.grid[n];
			let pos = tree.unpair(n).mult(size);
			ctx.strokeRect(pos.x, pos.y, size, size);
			ctx.globalAlpha = 0.003 * node.length;
			ctx.fillRect(pos.x, pos.y, size, size);
			ctx.globalAlpha = 1;
		});
	}
}
module.exports = DebugRender;


/***/ }),

/***/ 141:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(811);
const { merge } = __webpack_require__(929);
const RenderMethods = __webpack_require__(223);

/**
 * Graph for tracking variables
 */
class Graph {
	static defaultOptions = {
		title: "",
		titleSize: 14,
		titleColor: "white",
		anchorX: "left",
		anchorY: "top",
		background: "#0D0D0DE6",
		maxLength: 200,
		scaleRange: 100,
		lineColor: "#9C9C9C",
		lineWidth: 1,
		padding: 8,
		round: 5,
	}
	/**
	 * If the graph is enabled
	 * @type {boolean}
	 * @readonly
	 */
	enabled = true;
	canvas;
	ctx;
	data = {};

	/**
	 * Creates a graph
	 * @param {number} width - Width of the graph
	 * @param {number} height - Height of the graph
	 * @param {vec} position - Position of the graph
	 * @param {object} options - Other graph options
	 * @param {string} [options.title=""] - Title of the graph
	 * @param {number} [options.titleSize=14] - Font size of title
	 * @param {string} [options.titleColor="white"] - Color of title
	 * @param {boolean} [options.enabled=true] - If graph starts enabled
	 * @param {("left"|"right"|"center")} [options.anchorX="left"] - Relative x position of graph on the screen
	 * @param {("top"|"bottom"|"center")} [options.anchorY="top"] - Relative y position of graph on the screen
	 * @param {string} [options.background="#0D0D0DE6"] - Background color of graph
	 * @param {number} [options.padding=8] - Amount of padding around the graph
	 * @param {number} [options.round=5] - Amount of round around the graph
	 * @param {number} [options.scaleRange=100] - Minimum range for auto scaling
	 * @param {Array} [options.scaleRange=undefined] - Minimum and maximum y value of the graph, as Array of `[min, max]`. Leaving `undefined` uses auto scaling.
	 * @param {number} [options.maxLength=200] - Maximum number of points the graph can have
	 * @param {string} [options.lineColor="#9C9C9C"] - Color of the line. Use this if you only have 1 value you're graphing
	 * @param {object} [options.lineColor={ default: "#9C9C9C" }] - Colors of each line name. Use this notation if you have multiple lines on one graph
	 * @param {number} [options.lineWidth=1] - Width of the graph lines
	 * @example
	 * let graph = new Graph(200, 150, new vec(20, 20), {
	 * 	maxLength: 800,
	 * 	title: "Hello graph",
	 * 	titleSize: 12,
	 * 	background: "transparent",
	 * 	lineColor: {
	 * 		itemA: "#9D436C",
	 * 		itemB: "#5EA8BA",
	 * 	},
	 * 	padding: 10,
	 * 	scaleRange: [0, 144 * 2],
	 * });
	 */
	
	constructor(width = 200, height = 200, position = new vec(0, 0), options = {}) {
		let mergedOptions = { ...Graph.defaultOptions };
		merge(mergedOptions, options, 1);
		let { anchorX, anchorY } = mergedOptions;
		
		if (typeof mergedOptions.lineColor === "string") {
			mergedOptions.lineColor = { default: mergedOptions.lineColor };
		}
		merge(this, mergedOptions, 1);
		this.width = width;
		this.height = height;

		// Create canvas
		let scale = this.scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = "2";

		if (anchorX === "center") {
			canvas.style.left = `calc(50vw + ${ position.x }px)`;
			canvas.style.transform = `translateX(-50%)`;
		}
		else {
			canvas.style[anchorX] = `${position.x}px`;
		}

		if (anchorY === "center") {
			canvas.style.top = `calc(50vh + ${ position.y }px)`;
			canvas.style.transform = `translateY(-50%)`;
		}
		else {
			canvas.style[anchorY] =  `${position.y}px`;
		}
		canvas.style.transformOrigin = `${anchorX} ${anchorY}`;
		canvas.style.transform += ` scale(${1 / scale}, ${1 / scale})`;

		canvas.style.top =  `${position.x}px`;
		canvas.width =  scale * width;
		canvas.height = scale * height;
		canvas.style.background = "transparent";
		// canvas.style.pointerEvents = "none";
		document.body.appendChild(canvas);

		// Set up rendering
		this.update = this.update.bind(this);

		if (this.enabled) {
			this.animationFrame = requestAnimationFrame(this.update);
		}
	}

	/**
	 * Set if the graph is enabled
	 */
	setEnabled(enabled) {
		this.enabled = enabled;

		if (this.animationFrame != undefined) { // prevent multiple render updates running at once
			cancelAnimationFrame(this.animationFrame);
			delete this.animationFrame;
		}

		if (this.enabled) { // start rendering
			this.canvas.style.display = "block";
			this.update();
		}
		else {
			this.canvas.style.display = "none";
		}
	}

	_getStats(data) {
		let max = 0;
		let min = Infinity;
		let avg = (() => {
			let v = 0;
			for (let i = 0; i < data.length; i++) {
				let cur = data[i];
				v += cur;
				max = Math.max(max, cur);
				min = Math.min(min, cur);
			}
			return v / data.length;
		})();

		return {
			max: max,
			min: min,
			average: avg,
		};
	}
	update() {
		let { canvas, ctx, enabled, scale, width, height, title, titleSize, titleColor, background, round, padding, lineColor: allLineColors, lineWidth, maxLength, scaleRange } = this;
		let { data: allData } = this;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (enabled) {
			ctx.save();
			ctx.scale(scale, scale);

			// background
			ctx.beginPath();
			RenderMethods.roundedRect(width, height, new vec(width/2, height/2), round, ctx);
			ctx.fillStyle = background;
			ctx.fill();

			// title text
			ctx.beginPath();
			ctx.fillStyle = titleColor;
			ctx.textAlign = "left";
			ctx.font = `400 ${titleSize}px Arial`;
			ctx.fillText(title, padding, padding + titleSize - 4);
			

			// Find scale
			let valueRanges = {
				min: Infinity,
				max: -Infinity
			};
			if (Array.isArray(scaleRange)) {
				valueRanges = {
					min: scaleRange[0],
					max: scaleRange[1]
				};
			}
			else {
				for (let data of Object.values(allData)) {
					let { min, max } = this._getStats(data);
					valueRanges.min = Math.min(valueRanges.min, min);
					valueRanges.max = Math.max(valueRanges.max, max);
				}
				valueRanges.min = Math.min(valueRanges.min, (valueRanges.max + valueRanges.min - scaleRange) / 2);
				valueRanges.max = Math.max(valueRanges.max, (valueRanges.max + valueRanges.min + scaleRange) / 2);
			}
			
			let bounds = {
				min: new vec(padding, titleSize + padding + 5),
				max: new vec(width - padding, height - padding),
			};
			let boundSize = bounds.max.sub(bounds.min);
			function getPosition(point, i) {
				// point = Math.max(valueRanges.min, Math.min(valueRanges.max, point));
				const range = valueRanges.max - valueRanges.min;
				let x = bounds.min.x + (i / maxLength) * boundSize.x;
				let y = bounds.max.y - ((point - valueRanges.min) / range) * boundSize.y;
				return [x, y];
			}

			for (let dataName in allData) {
				// get data stats
				let data = allData[dataName];
				let lineColor = allLineColors[dataName];
				
				// graph line
				if (data.length > 1) {
					ctx.beginPath();
					ctx.moveTo(...getPosition(data[0], 0))
					for (let i = 1; i < data.length; i++) {
						ctx.lineTo(...getPosition(data[i], i));
					}
					ctx.lineWidth = lineWidth;
					ctx.lineJoin = "bevel";
					ctx.strokeStyle = lineColor;
					ctx.stroke();
				}
			}
			
			
			ctx.restore();
			this.animationFrame = requestAnimationFrame(this.update);
		}
	}

	/**
	 * Adds value to the graph
	 * @param {number} value - Value to add
	 * @param {string} [name="default"] - Name of line
	 * @example
	 * graph.addData(20); // Adds value 20. Only works if you used a string (not object) to set lineColor
	 * graph.addData(102.4, "itemA"); // Adds value 102.4 to the line named itemA
	 */
	addData(value, name = "default") {
		if (!this.lineColor[name]) {
			console.error(this.lineColor);
			throw new Error(`No data named ${name} in graph`);
		}
		
		if (!this.data[name]) this.data[name] = [];
		let data = this.data[name];
		data.push(value);
		while (data.length > 0 && data.length > this.maxLength) {
			data.shift();
		}
	}
}

module.exports = Graph;


/***/ }),

/***/ 763:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RenderMethods = __webpack_require__(223);
const vec = __webpack_require__(811);

/**
 * Handles rendering performance stats. Creates a graph in the top corner of the screen.
 */
class PerformanceRender {
	/**
	 * If the graph is enabled
	 * @type {boolean}
	 */
	enabled = false;
	canvas;
	ctx;
	position = new vec(20, 20);

	/**
	 * 
	 * @param {Performance} Performance - [Performance](./Performance.html)
	 * @param {Render} Render - [Render](./Render.html)
	 */
	constructor(Performance, Render) {
		this.Performance = Performance;

		// Create canvas
		let baseCanvas = Render.app.view;
		const width  = this.width  = 100;
		const height = this.height = 50;
		let scale = this.scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = "2";
		canvas.style.top =  "20px";
		canvas.style.right = "0px";
		canvas.style.left = "unset";
		canvas.width =  scale * width;
		canvas.height = scale * height;
		canvas.style.background = "transparent";
		canvas.style.pointerEvents = "none";
		canvas.style.transformOrigin = "top left";
		canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		baseCanvas.parentNode.appendChild(canvas);

		// Set up rendering
		this.update = this.update.bind(this);
		Render.app.ticker.add(this.update);
	}
	update() {
		let { canvas, ctx, enabled, Performance, scale, width, height } = this;
		let { history } = Performance;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (enabled) {
			ctx.save();
			ctx.scale(scale, scale);

			// background
			ctx.beginPath();
			RenderMethods.roundedRect(width, height, new vec(width/2, height/2), 5, ctx);
			ctx.fillStyle = "#0D0D0De6";
			ctx.fill();


			// get fps stats
			let maxFps = 0;
			let minFps = Infinity;
			let avgFps = (() => {
				let v = 0;
				for (let i = 0; i < history.fps.length; i++) {
					let cur = history.fps[i];
					v += cur;
					maxFps = Math.max(maxFps, cur);
					minFps = Math.min(minFps, cur);
				}
				return v / history.fps.length;
			})();
			let nearAvgFps = (() => {
				let v = 0;
				let n = Math.min(history.fps.length, 20);
				for (let i = 0; i < n; i++) {
					let cur = history.fps[i];
					v += cur;
				}
				return v / n;
			})();

			// fps text
			ctx.beginPath();
			ctx.fillStyle = "white";
			ctx.textAlign = "right";
			ctx.font = `400 ${12}px Arial`;
			ctx.fillText(`${Math.round(nearAvgFps)} fps`, width - 12, 5 + 12);

			
			if (history.fps.length > 10) { // fps graph
				let range = 100;
				let fpsRanges = {
					min: Math.max(0, Math.min(minFps, avgFps - range)),
					max: Math.max(maxFps, avgFps + range, 60),
				}
				const fpsRange = fpsRanges.max - fpsRanges.min;
				let bounds = {
					min: new vec(10, 18),
					max: new vec(width - 10, height - 4),
				};

				ctx.beginPath();
				function getPosition(point, i) {
					let x = bounds.max.x - (i / history.fps.length) * (bounds.max.x - bounds.min.x);
					let y = bounds.max.y - ((point - fpsRanges.min) / fpsRange) * (bounds.max.y - bounds.min.y);
					return [x, y];
				}
				ctx.moveTo(...getPosition(history.fps[0], 0))
				for (let i = 1; i < history.fps.length; i++) {
					ctx.lineTo(...getPosition(history.fps[i], i));
				}
				ctx.lineWidth = 1;
				ctx.lineJoin = "bevel";
				ctx.strokeStyle = "#9C9C9C";
				ctx.stroke();
			}

			// colored rect
			ctx.beginPath();
			let colors = [[0.75, "#3FF151"], [0.5, "#F5ED32"], [0.25, "#F89A2C"], [0, "#F74D4D"]];
			let boundMax = 60;
			ctx.fillStyle = "#808080";
			for (let color of colors) {
				if (avgFps >= color[0] * boundMax) {
					ctx.fillStyle = color[1];
					break;
				}
			}
			RenderMethods.roundedRect(6, 6, new vec(15, 13), 2, ctx);
			ctx.fill();
			
			
			ctx.restore();
		}
	}
}
module.exports = PerformanceRender;


/***/ }),

/***/ 219:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Node = __webpack_require__(593);
const vec = __webpack_require__(811);
const Common = __webpack_require__(929);

/**
 * A polygon render object
 * @extends Node
 */
class PolygonRender extends Node {
	static defaultOptions = {
		container: undefined, // {PIXI Container}
		layer: 0, // number
		position: new vec(0, 0), // {vec}
		angle: 0, // number [0, 2PI]
		subtype: "polygon", // "polygon" | "rectangle" | "circle"
		vertices: [],

		visible: true,
		alpha: 1,
		background: "transparent",
		border: "transparent",
		borderWidth: 3,
		borderOffset: 0.5,
		lineCap: "butt",
		lineJoin: "miter",
		
		// subtype: "Rectangle" only options
		width: 100,
		height: 100,
		round: 0,

		// subtype: "Circle" only options
		radius: 50,
	}
	static all = new Set();
	nodeType = "PolygonRender";
	constructor(options = {}) {
		super();
		let defaults = { ...PolygonRender.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		Common.merge(this, options, 1);

		this.#create();
	}
	#create() {
		let graphic = this.graphic = new PIXI.Graphics();
		let { position, angle, subtype, vertices } = this;
		let { layer, alpha, background, border, borderWidth, lineCap, lineJoin, borderOffset, round } = this;
		let { parseColor } = Common;
		
		background = parseColor(background);
		if (background[1] > 0) graphic.beginFill(...background);

		border = parseColor(border);
		if (border[1] > 0) {
			graphic.lineStyle({
				width: borderWidth,
				color: border[0],
				alpha: border[1],
				cap: lineCap,
				join: lineJoin,
				alignment: borderOffset,
			});
		}

		if (subtype === "Rectangle") {
			let { width, height } = this;
			
			if (round > 0) {
				graphic.drawRoundedRect(-width/2, -height/2, width, height, round);
			}
			else {
				graphic.drawRect(-width/2, -height/2, width, height);
			}
		}
		else if (subtype === "Circle") {
			let { radius } = this;
			graphic.drawCircle(0, 0, radius);
		}
		else { // manually draw vertices
			let center = Common.getCenterOfMass(vertices);
			graphic.drawPolygon(vertices.map(vertice => vertice.sub(center)));
			// graphic.drawPolygon(vertices);
		}
		if (border[1] > 0) graphic.closePath();
		if (background[1] > 0) graphic.endFill();
		graphic.zIndex = layer;

		// Translate to position
		let translateDelta = new vec(position);
		this.position = new vec(0, 0);
		this.translate(translateDelta);

		// Rotate to angle
		this.angle = 0;
		this.translateAngle(angle);

		// Set alpha
		this.setAlpha(alpha);

		// Trigger events
		this.trigger("load");
	}

	/**
	 * Sets the render layer (z index)
	 * @param {number} layer - Render layer (z index) for the render
	 */
	setLayer(layer) {
		this.layer = layer;
		this.graphic.zIndex = layer;
	}

	/**
	 * Sets the render's alpha
	 * @param {number} alpha - Opacity, between 0 and 1 inclusive
	 */
	setAlpha(alpha) {
		this.alpha = alpha;
		this.graphic.alpha = alpha;
	}

	/**
	 * Changes if the render is visible
	 * @param {boolean} visible - If the render is visible
	 */
	setVisible(visible) {
		this.visible = visible;
		this.graphic.visible = visible;
	}

	/**
	 * Shifts the render's position by `delta`
	 * @param {vec} delta - Position render is shifted
	 */
	translate(delta) {
		super.translate(delta);

		let { graphic } = this;
		graphic.position.x += delta.x;
		graphic.position.y += delta.y;
	}

	/**
	 * Rotates the render relative to current angle
	 * @param {number} angle - Amount to rotate render, in radians
	 */
	translateAngle(angle) {
		let { graphic } = this;
		this.angle += angle;
		graphic.rotation += angle;
	}

	/**
	 * Adds the render object to the world
	 */
	add() {
		super.add();
		PolygonRender.all.add(this);
		this.container.addChild(this.graphic);
	}
	/**
	 * Removes the render object from the world
	 */
	delete() {
		super.delete();
		PolygonRender.all.delete(this);
		this.container.removeChild(this.graphic);
	}
	
	/**
	 * Destroys the render object. Use when you know the render will no longer be used
	 */
	destroy() {
		this.graphic.destroy();
	}

	#events = {
		delete: [],
		add: [],
		load: [],
		render: [],
	}
	/**
	 * Binds a function to an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function called when event fires
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a function from an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function bound to event
	 */
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	/**
	 * Fires an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 */
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}
module.exports = PolygonRender;


/***/ }),

/***/ 681:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Camera = __webpack_require__(458);
const Common = __webpack_require__(929);
const vec = __webpack_require__(811);

/**
 * Main render object that handles the camera, pixel ratio, resizing, what is rendered, etc
 */
class Render {
	static defaultOptions = {
		background: false,
		pixelRatio: window.devicePixelRatio ?? 1,
		ySort: false,
		resizeTo: window,
		antialias: true,
		scaleMode: PIXI.SCALE_MODES.LINEAR,
		getBoundSize: function(width, height) {
			return Math.sqrt(width ** 2 + height ** 2) || 1;
		}
	}
	app = null;
	camera = null;
	pixelRatio = 1;

	/**
	 * 
	 * @param {object} options - Render options
	 * @param {string} [options.background="transparent"] - Background color, such as `"#FFFFFF00"`, `"rgb(0, 0, 0)"`, or `"transparent"`
	 * @param {number} [options.pixelRatio=devicePixelRatio] - Render resolution percent, use default unless you have a reason to change it
	 * @param {boolean} [options.ySort=false] - Whether to sort the render layer of bodies by their y coordinate
	 * @param {*} [options.resizeTo=window] - What the canvas should resize to, see PIXI.js `resizeTo` for options
	 * @param {boolean} [options.antialias=true] - If the render should have antialiasing
	 * @param {function} [options.getBoundSize=function(width, height)] - Function that determines the bound size, which is how big the view should be based on the canvas width and height
	 */
	constructor(options = {}) {
		// Test if PIXI is loaded
		try { PIXI.settings; }
		catch(err) {
			throw new Error("PIXI is not defined\nHelp: try loading pixi.js before creating a ter app");
		}

		// Load options
		let defaults = { ...Render.defaultOptions };
		let resizeTo = options.resizeTo ?? defaults.resizeTo;
		delete options.resizeTo;
		Common.merge(defaults, options, 1);
		options = defaults;
		let { background, ySort, pixelRatio, antialias, getBoundSize, scaleMode } = options;

		// Create camera
		this.camera = new Camera();

		// Setup bound size
		this.getBoundSize = getBoundSize;

		// Set basic settings
		PIXI.settings.SCALE_MODE = scaleMode;
		let scale = PIXI.settings.RESOLUTION = this.pixelRatio = pixelRatio;
		PIXI.Filter.defaultResolution = 0;
		PIXI.Container.defaultSortableChildren = true

		// Parse background color
		background = Common.parseColor(background);

		// Create PIXI app
		let app = this.app = new PIXI.Application({
			background: background[0],
			backgroundAlpha: background[1],
			resizeTo: resizeTo ?? window,
			antialias: antialias ?? true,
		});
		document.body.appendChild(app.view);
		app.ticker.add(this.update.bind(this)); // Start render
		app.stage.filters = []; // Makes working with pixi filters easier
		app.stage.sortableChildren = true; // Important so render layers work

		// Set up pixel ratio scaling
		let view = app.view;
		view.style.transformOrigin = "top left";
		view.style.transform = `scale(${1 / scale}, ${1 / scale})`;

		// Make sure canvas stays correct size
		this.setSize(app.screen.width, app.screen.height);
		app.renderer.on("resize", this.setSize.bind(this));

		// Set up y sorting if enabled
		if (ySort) {
			app.stage.on("sort", function beforeSort(sprite) {
				sprite.zOrder = sprite.y;
			});
		}
	}
	setSize(width, height) {
		let pixelRatio = this.pixelRatio;
		this.camera.boundSize = this.getBoundSize(width, height);
	}
	setPixelRatio(pixelRatio) {
		this.pixelRatio = pixelRatio;
		PIXI.settings.RESOLUTION = pixelRatio;
		this.setSize(this.app.screen.width, this.app.screen.height); // update bounds with new pixel ratio
	}

	/**
	 * Updates renderer and its camera. Triggers `beforeUpdate` and `afterUpdate` events on this Render.
	 * @param {number} delta - Frame time, in seconds
	 */
	update(delta) {
		delta = delta / 60; // convert to ms
		this.trigger("beforeUpdate");

		let { app, camera } = this;
		let { stage } = app;
		let { position: cameraPosition, translation, fov, boundSize } = camera;
		
		let screenSize = new vec(app.screen.width, app.screen.height);
		translation.set({ x: -cameraPosition.x * boundSize/fov + screenSize.x/2, y: -cameraPosition.y * boundSize/fov + screenSize.y/2 });
		camera.scale = boundSize / fov;
		
		// update camera position
		stage.x = translation.x;
		stage.y = translation.y;
		stage.scale.x = camera.scale;
		stage.scale.y = camera.scale;

		this.trigger("afterUpdate");
	}

	// - Events
	#events = {
		beforeUpdate: [],
		afterUpdate: [],
	}
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}
module.exports = Render;


/***/ }),

/***/ 223:
/***/ ((module) => {

let RenderMethods = {
	// ~ Point transformations
	screenPtToGame: function(point, Render) {
		const { camera, pixelRatio } = Render;
		const { scale, translation } = camera;
		return new vec((point.x * pixelRatio - translation.x) / scale, (point.y * pixelRatio - translation.y) / scale);
	},
	gamePtToScreen: function(point, Render) {
		const { camera, pixelRatio } = Render;
		const { scale, translation } = camera;
		return new vec((point.x * scale + translation.x) / pixelRatio, (point.y * scale + translation.y) / pixelRatio);
	},
	roundedPolygon: function(vertices, round, graphic) {
		if (vertices.length < 3) {
			console.warn("RenderMethods.roundedPolygon needs at least 3 vertices", vertices);
			return;
		}
		function getPoints(i) {
			let curPt = vertices[i];
			let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
			let nextPt = vertices[(i + 1) % vertices.length];

			let lastDiff = lastPt.sub(curPt);
			let nextDiff = curPt.sub(nextPt);
			let lastLen = lastDiff.length;
			let nextLen = nextDiff.length;

			let curRound = Math.min(lastLen / 2, nextLen / 2, round);
			let cp = curPt;
			let pt1 = cp.add(lastDiff.normalize().mult(curRound));
			let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

			return [pt1, cp, pt2];
		}

		let start = getPoints(0);
		graphic.moveTo(start[0].x, start[0].y);
		graphic.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

		for (let i = 1; i < vertices.length; i++) {
			let cur = getPoints(i);
			graphic.lineTo(cur[0].x, cur[0].y);
			graphic.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
		}

		graphic.lineTo(start[0].x, start[0].y);
	},
	roundedPolygonCtx: function(vertices, round, ctx) {
		if (vertices.length < 3) {
			console.warn("RenderMethods.roundedPolygon needs at least 3 vertices", vertices);
			return;
		}

		function getPoints(i) {
			let curPt = vertices[i];
			let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
			let nextPt = vertices[(i + 1) % vertices.length];

			let lastDiff = lastPt.sub(curPt);
			let nextDiff = curPt.sub(nextPt);
			let lastLen = lastDiff.length;
			let nextLen = nextDiff.length;

			let curRound = Math.min(lastLen / 2, nextLen / 2, round);
			let cp = curPt;
			let pt1 = cp.add(lastDiff.normalize().mult(curRound));
			let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

			return [pt1, cp, pt2];
		}

		let start = getPoints(0)
		ctx.moveTo(start[0].x, start[0].y);
		ctx.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

		for (let i = 1; i < vertices.length; i++) {
			if (round === 0) {
				ctx.lineTo(vertices[i].x, vertices[i].y);
			}
			else {
				let cur = getPoints(i);
				ctx.lineTo(cur[0].x, cur[0].y);
				ctx.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
			}
		}

		ctx.closePath();
	},
	roundedRect: function(width, height, position, round, ctx) {
		RenderMethods.roundedPolygonCtx([
			new vec(-width/2, -height/2).add2(position),
			new vec( width/2, -height/2).add2(position),
			new vec( width/2,  height/2).add2(position),
			new vec(-width/2,  height/2).add2(position),
		], round, ctx);
	},
	arrow: function(position, direction, size = 10, ctx) {
		let endPos = new vec(position.x + direction.x, position.y + direction.y);
		let sideA = direction.rotate(Math.PI * 3/4).normalize2().mult(size);
		let sideB = sideA.reflect(direction.normalize());

		ctx.moveTo(position.x, position.y);
		ctx.lineTo(endPos.x, endPos.y);
		ctx.lineTo(endPos.x + sideA.x, endPos.y + sideA.y);
		ctx.moveTo(endPos.x, endPos.y);
		ctx.lineTo(endPos.x + sideB.x, endPos.y + sideB.y);
	},
}
module.exports = RenderMethods;


/***/ }),

/***/ 996:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

let Render = module.exports;

Render.Polygon = __webpack_require__(219);
Render.Sprite = __webpack_require__(416);


/***/ }),

/***/ 416:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Common = __webpack_require__(929);
const Node = __webpack_require__(593);
const vec = __webpack_require__(811);

// todo: load all sprites when game is loaded
// todo: properly delete sprites when bodies no longer used

/**
 * A sprite render object
 * @extends Node
 */
class Sprite extends Node {
	static imageDir = "./img/";
	static defaultOptions = {
		container: undefined, // {PIXI Container}
		layer: 0, // number
		position: new vec(0, 0), // {vec}
		angle: 0, // number [0, 2PI]

		visible: true,
		alpha: 1,
		src: "",
		
		scale: new vec(1, 1),
		width:  undefined,
		height: undefined,
	}
	static all = new Set();

	loaded = false;
	nodeType = "Sprite";
	constructor(options) {
		super();
		let defaults = { ...Sprite.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		Common.merge(this, options, 1);

		this.src = Sprite.imageDir + this.src;
		this.position = new vec(this.position ?? { x: 0, y: 0 });
		this.add = this.add.bind(this);

		this.create();
	}
	create() {
		let { width, height, layer, position, angle, src } = this;
		let sprite = this.sprite = PIXI.Sprite.from(src);
		
		this.loaded = true;
		sprite.anchor.set(0.5);

		if (width != undefined && height != undefined) {
			this.setSize(width, height);
		}

		// Update alpha
		this.setAlpha(this.alpha);

		// Update layer
		this.setLayer(layer);

		// Translate to position
		let translateDelta = new vec(position);
		this.position.set(new vec(0, 0));
		this.translate(translateDelta);
		
		// Rotate to angle
		this.angle = 0;
		this.translateAngle(angle);

		
		this.trigger("load");
	}
	
	/**
	 * Sets the render layer (z index)
	 * @param {number} layer - Render layer (z index) for the render
	 */
	setLayer(layer) {
		this.layer = layer;
		if (!this.loaded) return;
		this.sprite.zIndex = layer;
	}

	/**
	 * Sets the sprite's scale
	 * @param {vec} scale - New scale
	 */
	setScale(scale) {
		this.scale.set(scale);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.scale.x = this.scale.x;
		sprite.scale.y = this.scale.y;
	}

	/**
	 * Sets the sprite's width and height
	 * @param {number} width - New width
	 * @param {number} height - New height
	 */
	setSize(width, height) {
		if (width != undefined) this.width = width;
		if (height != undefined) this.height = height;

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.width =  this.width;
		sprite.height = this.height;
	}

	/**
	 * Sets the sprite's alpha
	 * @param {number} alpha - Opacity, between 0 and 1 inclusive
	 */
	setAlpha(alpha) {
		this.alpha = alpha;
		if (!this.loaded) return;
		this.sprite.alpha = alpha;
	}

	/**
	 * Changes if the sprite is visible
	 * @param {boolean} visible - If the sprite is visible
	 */
	setVisible(visible) {
		this.visible = visible;
		if (!this.loaded) return;
		this.sprite.visible = visible;
	}

	/**
	 * Shifts the sprite's position by `delta`
	 * @param {vec} delta - Amount sprite is shifted by
	 */
	translate(delta) {
		super.translate(delta);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.position.x += delta.x;
		sprite.position.y += delta.y;
	}
	
	/**
	 * Rotates the sprite relative to current angle
	 * @param {number} angle - Amount to rotate sprite, in radians
	 */
	translateAngle(angle, pivot = this.position) {
		super.translateAngle(angle, pivot);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.rotation += angle;
	}

	/**
	 * Adds the sprite to the world
	 */
	add() {
		if (!this.sprite && this.isAdded()) {
			this.on("load", this.add);
			return;
		}

		super.add();
		Sprite.all.add(this);
		this.container.addChild(this.sprite);
	}
	
	/**
	 * Removes the sprite from the world
	 */
	delete() {
		super.delete();
		Sprite.all.delete(this);
		this.container.removeChild(this.sprite);
		
		this.off("load", this.add);
	}
	
	/**
	 * Destroys the sprite. Use when you know the sprite will no longer be used
	 */
	destroy() {
		this.sprite.destroy();
	}


	#events = {
		load: [],
		add: [],
		delete: [],
	}
	/**
	 * Binds a function to an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function called when event fires
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a function from an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function bound to event
	 */
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	/**
	 * Fires an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 */
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}
module.exports = Sprite;


/***/ }),

/***/ 281:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Node = __webpack_require__(593);
const Common = __webpack_require__(929);
const vec = __webpack_require__(811);

class Spritesheet extends Node {
	static all = new Set();
	static defaultOptions = {
		container: undefined, // {PIXI Container}
		layer: 0, // number
		position: new vec(0, 0), // {vec}
		angle: 0, // number [0, 2PI]

		visible: true,
		alpha: 1,
		speed: 1 / 6,
		src: "",
		animation: "",
		
		scale: new vec(1, 1),
		width:  undefined,
		height: undefined,
	}

	constructor(options) {
		super();
		let defaults = { ...Spritesheet.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		Common.merge(this, options, 1);

		this.position = new vec(this.position ?? { x: 0, y: 0 });
		this.add = this.add.bind(this);

		this.create();

	}
	create() {
		let { width, height, layer, position, angle, src, animation: animationName } = this;
		const animations = PIXI.Assets.cache.get(src).data.animations;
		const frames = animations[animationName];
		if (!frames) {
			throw new Error("No animation of name " + animationName);
		}
		const sprite = PIXI.AnimatedSprite.fromFrames(animations[animationName]);
		sprite.animationSpeed = this.speed;
		this.sprite = sprite;

		this.loaded = true;
		sprite.anchor.set(0.5);

		if (width != undefined && height != undefined) {
			this.setSize(width, height);
		}

		// Update alpha
		this.setAlpha(this.alpha);

		// Update layer
		this.setLayer(layer);

		// Translate to position
		let translateDelta = new vec(position);
		this.position.set(new vec(0, 0));
		this.translate(translateDelta);
		
		// Rotate to angle
		this.angle = 0;
		this.translateAngle(angle);

		
		this.trigger("load");
	}
	/**
	 * Adds the sprite to the world
	 */
	add() {
		if (!this.sprite && this.isAdded()) {
			this.on("load", this.add);
			return;
		}

		super.add();
		this.container.addChild(this.sprite);
		Spritesheet.all.add(this);
		this.sprite.play();
	}
	/**
	 * Removes the sprite from the world
	 */
	delete() {
		super.delete();
		Spritesheet.all.delete(this);
		this.container.removeChild(this.sprite);
		this.sprite.stop();
		
		this.off("load", this.add);
	}

	/**
	 * Sets the animation's speed
	 * @param {Number} speed 
	 */
	setSpeed(speed) {
		this.speed = speed;
		this.sprite.animationSpeed = speed;
	}

	/**
	 * Sets the render layer (z index)
	 * @param {number} layer - Render layer (z index) for the render
	 */
	setLayer(layer) {
		this.layer = layer;
		if (!this.loaded) return;
		this.sprite.zIndex = layer;
	}

	/**
	 * Sets the sprite's scale
	 * @param {vec} scale - New scale
	 */
	setScale(scale) {
		this.scale.set(scale);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.scale.x = this.scale.x;
		sprite.scale.y = this.scale.y;
	}

	/**
	 * Sets the sprite's width and height
	 * @param {number} width - New width
	 * @param {number} height - New height
	 */
	setSize(width, height) {
		if (width != undefined) this.width = width;
		if (height != undefined) this.height = height;

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.width =  this.width;
		sprite.height = this.height;
	}

	/**
	 * Sets the sprite's alpha
	 * @param {number} alpha - Opacity, between 0 and 1 inclusive
	 */
	setAlpha(alpha) {
		this.alpha = alpha;
		if (!this.loaded) return;
		this.sprite.alpha = alpha;
	}

	/**
	 * Changes if the sprite is visible
	 * @param {boolean} visible - If the sprite is visible
	 */
	setVisible(visible) {
		this.visible = visible;
		if (!this.loaded) return;
		this.sprite.visible = visible;
	}

	/**
	 * Shifts the sprite's position by `delta`
	 * @param {vec} delta - Amount sprite is shifted by
	 */
	translate(delta) {
		super.translate(delta);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.position.x += delta.x;
		sprite.position.y += delta.y;
	}
	
	/**
	 * Rotates the sprite relative to current angle
	 * @param {number} angle - Amount to rotate sprite, in radians
	 */
	translateAngle(angle, pivot = this.position) {
		super.translateAngle(angle, pivot);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.rotation += angle;
	}
	
	/**
	 * Destroys the sprite. Use when you know the sprite will no longer be used
	 */
	destroy() {
		this.sprite.destroy();
	}


	#events = {
		load: [],
		add: [],
		delete: [],
	}
	/**
	 * Binds a function to an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function called when event fires
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a function from an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function bound to event
	 */
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	/**
	 * Fires an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 */
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}

module.exports = Spritesheet;


/***/ }),

/***/ 627:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

let ter = module.exports;

ter.Game = __webpack_require__(830);
ter.Common = __webpack_require__(929);
ter.Ticker = __webpack_require__(754);
ter.Performance = __webpack_require__(656);


ter.Node = __webpack_require__(593);
ter.World = __webpack_require__(569);

ter.Engine = __webpack_require__(726);
ter.Bodies = __webpack_require__(789);

ter.Render = __webpack_require__(996);
ter.RenderMethods = __webpack_require__(223);
ter.Graph = __webpack_require__(141);
ter.Sprite = __webpack_require__(416);
ter.Spritesheet = __webpack_require__(281);

ter.vec = __webpack_require__(811);
ter.Grid = __webpack_require__(953);
ter.Bezier = __webpack_require__(506);
ter.Bounds = __webpack_require__(60);


ter.BehaviorTree = __webpack_require__(985);
ter.Functions = __webpack_require__(794);
ter.Inputs = __webpack_require__(764);
ter.Animation = __webpack_require__(847);
ter.DiscreteAnimation = __webpack_require__(218);

ter.simplexNoise = __webpack_require__(99);
ter.polyDecomp = __webpack_require__(371);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(627);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});