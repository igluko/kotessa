/****************************************************************************
 * Winwheel.js - version 2.10
 * Author: Douglas McKechie
 * 
 * A highly configurable HTML5 canvas animation framework (no dependencies) 
 * that allows you to easily create spinning prize wheels, survey wheels,
 * coupon wheels, game wheels, or any other type of wheel you can imagine.
 *
 * "Monkey-patched" for simpler usage in the browser directly,
 * without require() or module.exports.
 *
 * GitHub page: https://github.com/zarocknz/javascript-winwheel
 * Released under the MIT license.
 *---------------------------------------------------------------------------
 * 2020-12-07: 2.10: Added pointerGuide to draw a line from the center to the edge.
 * 2019-09-22: 2.8:  Some minor updates.
 * 2018-04-19: 2.7:  Fix reference to window, minor changes
 ****************************************************************************/

(function (window) {
    // ========================================================================
    // The constructor for the WinWheel object.
    // ========================================================================
    window.Winwheel = function (params)
    {
        defaultOptions = {
            'canvasId'          : 'canvas',
            'centerX'           : null,
            'centerY'           : null,
            'outerRadius'       : null,
            'innerRadius'       : 0,
            'numSegments'       : 1,
            'drawMode'          : 'code',
            'rotationAngle'     : 0,
            'textFontFamily'    : 'Arial',
            'textFontSize'      : 20,
            'textFontWeight'    : 'bold',
            'textOrientation'   : 'horizontal',
            'textAlignment'     : 'center',
            'textDirection'     : 'normal',
            'textMargin'        : null,
            'textFillStyle'     : 'black',
            'textStrokeStyle'   : null,
            'textLineWidth'     : 1,
            'fillStyle'         : 'silver',
            'strokeStyle'       : 'black',
            'lineWidth'         : 1,
            'clearTheCanvas'    : true,
            'imageOverlay'      : false,
            'drawText'          : true,
            'pointerAngle'      : 0,
            'wheelImage'        : null,
            'imageDirection'    : 'N',
            'responsive'        : false,

            'scaleFactor'       : 1,   // Used when responsive.

            'animation' : {},
            'pins'      : {},
            'pointerGuide' : {}
        };

        // ------------------------------------------
        // Loop through the default options and create them on this class set to the default value.
        // If a value for them has been passed in then set that instead of the default.
        // ------------------------------------------
        for (var key in defaultOptions)
        {
            if ((params != null) && (typeof(params[key]) !== 'undefined'))
            {
                this[key] = params[key];
            }
            else
            {
                this[key] = defaultOptions[key];
            }
        }

        // ------------------------------------------
        // If the text margin is null then set to half the text size.
        // ------------------------------------------
        if (this.textMargin === null) {
            this.textMargin = (this.textFontSize / 1.7);
        }

        // ------------------------------------------
        // Also set some extra variables that are not passed in as parameters. 
        // ------------------------------------------
        this.segments                = new Array(null);
        this.updateSegments = winwheelUpdateSegments;   // See further down for the function.
        this.deleteSegment = winwheelDeleteSegment;
        this.insertSegment = winwheelInsertSegment;
        this.keyPressTimeoutHandle  = null;

        // Create pointers to functions so they can be passed around as callbacks if desired.
        this.drawWheel              = winwheelDrawWheel;
        this.drawSegments           = winwheelDrawSegments;
        this.drawSegmentText        = winwheelDrawSegmentText;
        this.drawPointer            = winwheelDrawPointer;
        this.drawPointerGuide       = winwheelDrawPointerGuide;
        this.clearCanvas            = winwheelClearCanvas;
        this.draw                   = winwheelDraw;
        this.stopAnimation          = winwheelStopAnimation;
        this.animationLoop          = winwheelAnimationLoop;
        this.computeAnimation       = winwheelComputeAnimation;
        this.startAnimation         = winwheelStartAnimation;
        this.rotate                 = winwheelRotate;
        this.getIndicatedSegment    = winwheelGetIndicatedSegment;
        this.getIndicatedSegmentNumber = winwheelGetIndicatedSegmentNumber;

        // ------------------------------------------
        // If a value has not been specified for the segments then populate with defaults.
        // ------------------------------------------
        if ((params != null) && (typeof(params['segments']) !== 'undefined'))
        {
            // Create specified segments by looping through all the objects in the array supplied.
            for (x = 1; x <= this.numSegments; x ++)
            {
                if ((typeof(params['segments'][x-1]) !== 'undefined'))
                {
                    this.segments[x] = new winwheelSegment(params['segments'][x-1]);
                }
                else
                {
                    this.segments[x] = new winwheelSegment();
                }
            }
        }
        else
        {
            // Create default segments if none have been passed in.
            for (x = 1; x <= this.numSegments; x ++)
            {
                this.segments[x] = new winwheelSegment();
            }
        }

        // ------------------------------------------
        // Update the segment sizes (but only do this if the drawMode is 'code').
        // This also calls code that calculates the segment start and end angles.
        // ------------------------------------------
        this.updateSegmentSizes = this.updateSegments;
        if (this.drawMode == 'code') {
            this.updateSegmentSizes();
        }

        // ------------------------------------------
        // If the animation options have been passed in then create animation object as a member of this class.
        // ------------------------------------------
        this.animation = new winwheelAnimation(this.animation);

        // ------------------------------------------
        // If pins have been specified then create create a member of this class to store them.
        // ------------------------------------------
        this.pins = new winwheelPins(this.pins);

        // ------------------------------------------
        // If pointer guide has been specified then create create a member of this class to store them.
        // ------------------------------------------
        this.pointerGuide = new winwheelPointerGuide(this.pointerGuide);

        // ------------------------------------------
        // Do some extra calculations if image drawing is to be used.
        // ------------------------------------------
        if ((params != null) && (typeof(params['wheelImage']) !== 'undefined'))
        {
            this.wheelImage = new Image();
            this.wheelImage.onload = winwheelLoadedImage;
            this.wheelImage.src    = this.wheelImage;
        }
        else if (this.drawMode == 'image')
        {
            console.log('You have set drawMode = "image" but not specified wheelImage in the parameters');
        }

        // If responsive is true then try and add event listeners to support it.
        if (this.responsive) {
            winwheelResize(this);
        }
    }

    // ===========================================================================
    // This function takes the segment text and returns the text in the specified orientation, alignment, and direction.
    // The default is horizontal which means no modification to the text.
    // ===========================================================================
    function winwheelGetOrientationAdjustedText(segment, text) {
        // TODO: If ever needed, can add code here that modifies text to be vertical, curved, etc.
        return text;
    }

    // ====================================================================================================================
    // The Segment object. When creating a json of options for a new wheel, these can be passed in as parameters for segments.
    // ====================================================================================================================
    function winwheelSegment(options)
    {
        // Define default options for segments, most are null so that the global defaults for the wheel are used if not specified.
        var defaults = {
            'size'              : null,
            'text'              : '',
            'fillStyle'         : null,
            'strokeStyle'       : null,
            'lineWidth'         : null,
            'textFontFamily'    : null,
            'textFontSize'      : null,
            'textFontWeight'    : null,
            'textOrientation'   : null,
            'textAlignment'     : null,
            'textDirection'     : null,
            'textMargin'        : null,
            'textFillStyle'     : null,
            'textStrokeStyle'   : null,
            'textLineWidth'     : null,
            'image'             : null,
            'imageDirection'    : null,
            'imgData'           : null
        };

        // Now loop through the defaults and create properties on this class with the default value;
        // then for any value passed in as an option, override the default.
        for (var key in defaults)
        {
            this[key] = (typeof(options[key]) !== 'undefined') ? options[key] : defaults[key];
        }

        // Also set some properties that are not parameters of this object.
        this.startAngle = 0;
        this.endAngle   = 0;
        this.x          = 0;
        this.y          = 0;
    }

    // ====================================================================================================================
    // This function sorts out the segment sizes. Some segments may have size set so that will need to be worked out. 
    // ====================================================================================================================
    function winwheelUpdateSegments()
    {
        // If this object has more than one segment then work out how large they are from any size values set.
        // ---------------------------------------------------------------------------------------------------
        var arcUsed = 0;
        var numSet  = 0;

        // Remember, to make it easy to maintain we store the segments in an array using 1-based indexing.
        for (var x = 1; x <= this.numSegments; x ++)
        {
            if (this.segments[x].size !== null)
            {
                arcUsed += this.segments[x].size;
                numSet ++;
            }
        }

        var arcLeft = (360 - arcUsed);

        // Create a variable to hold how many segments do not have a set size. 
        var numNotSet = (this.numSegments - numSet);

        if (arcLeft > 0)
        {
            var arcEach = (arcLeft / numNotSet);

            // --------------------------
            // Now loop though and set the start and end angle of each segment.
            // --------------------------
            var currentAngle = 0;

            for (var x = 1; x <= this.numSegments; x ++)
            {
                // Set start angle.
                this.segments[x].startAngle = currentAngle;

                // If the size is set then add that to the current angle, otherwise add the arcEach.
                if (this.segments[x].size)
                {
                    currentAngle += this.segments[x].size;
                }
                else
                {
                    currentAngle += arcEach;
                }

                // Set end angle.
                this.segments[x].endAngle = currentAngle;
            }
        }
        else
        {
            // The arcLeft would be zero if all segments have a size specified, or if a single segment wheel.
            // So loop though and just set angles...
            var currentAngle = 0;

            for (var x = 1; x <= this.numSegments; x ++)
            {
                this.segments[x].startAngle = currentAngle;
                currentAngle += this.segments[x].size;
                this.segments[x].endAngle   = currentAngle;
            }
        }
    }

    // ====================================================================================================================
    // This function deletes the specified segment from the wheel. It then sorts out the other segments so the wheel is still
    // valid. You can pass in the segment number, or the segment object itself.
    // ====================================================================================================================
    function winwheelDeleteSegment(position)
    {
        // If the position is not true or greater than number of segments alert and return false.
        if (typeof position !== 'undefined')
        {
            if ((position > 0) && (position <= this.numSegments))
            {
                // Create a new array of segments.
                var tempArray = new Array(null);
                var x = 1;
                var y = 1;

                // Loop though the segments and if a segment is not the one to be deleted copy it in to the new array.
                for (x = 1; x <= this.numSegments; x ++)
                {
                    if (x !== position)
                    {
                        tempArray[y] = this.segments[x];
                        y ++;
                    }
                }

                // Now we have our new array of segment objects, set the wheel segments array equal to it.
                this.segments = tempArray;

                // Decrement the numSegments.
                this.numSegments --;

                // Re-parse the segment options to ensure all is correct.
                this.updateSegmentSizes();

                return true;
            }
            else
            {
                console.log('Segment number to delete is out of range: ' + position);
                return false;
            }
        }
        else
        {
            console.log('Segment number not specified');
            return false;
        }
    }

    // ====================================================================================================================
    // This function adds a segment to the wheel. You can pass in values for it, or if not supplied the default options
    // are used. If a position is not specified the segment is added to the end of the wheel.
    // ====================================================================================================================
    function winwheelInsertSegment(segmentData, position)
    {
        // Create a new segment object passing in the data (so the data values get mixed in).
        var newSegment = new winwheelSegment(segmentData);

        // If the position is not specified then set to this.numSegments + 1 so it gets added to the end.
        if (typeof position === 'undefined') {
            position = this.numSegments + 1;
        }

        // If the position is out of range just set to end.
        if ((position < 1) || (position > (this.numSegments + 1))) {
            position = this.numSegments + 1;
        }

        // Create a new array of segments, which is empty.
        var tempArray = new Array(null);

        // Loop though the existing segments and copy them to the new array, inserting the new segment at the specified position.
        var x = 1;
        var y = 1;

        for (x = 1; x < (this.numSegments + 1); x ++)
        {
            // If x is not the position to insert the new segment then copy the segment in the existing wheel to the new array.
            if (x !== position) {
                tempArray[y] = this.segments[x];
                y ++;
            } else {
                tempArray[y] = newSegment;
                y ++;
                tempArray[y] = this.segments[x];
                y ++;
            }
        }

        // If the position is this.numSegments + 1 then we need to add the new segment on to the end.
        if (position === (this.numSegments + 1)) {
            tempArray[y] = newSegment;
        }

        // Now set the wheel segments array to this new array and increase the numSegments by 1.
        this.segments = tempArray;
        this.numSegments ++;

        // Re-parse the segment options.
        this.updateSegmentSizes();
    }

    // ====================================================================================================================
    // The Pin object. For consistency, pins options are passed in as an object.
    // ====================================================================================================================
    function winwheelPins(options)
    {
        var defaults = {
            'visible'        : false,
            'number'         : 36,
            'outerRadius'    : 3,
            'fillStyle'      : 'grey',
            'strokeStyle'    : 'black',
            'lineWidth'      : 1,
            'responsive'     : false
        };

        // Now loop through the defaults and create properties on this class with the default value;
        // then for any value passed in as an option, override the default.
        for (var key in defaults)
        {
            this[key] = (typeof(options[key]) !== 'undefined') ? options[key] : defaults[key];
        }
    }

    // ====================================================================================================================
    // The pointer guide. When set it shows a line from the center of the wheel to the outside at the pointerAngle.
    // ====================================================================================================================
    function winwheelPointerGuide(options)
    {
        var defaults = {
            'display'     : false,
            'strokeStyle' : 'red',
            'lineWidth'   : 3
        };

        // Now loop through the defaults and override with anything passed in.
        for (var key in defaults)
        {
            this[key] = (typeof(options[key]) !== 'undefined') ? options[key] : defaults[key];
        }
    }

    // ====================================================================================================================
    // The Animation object. When creating a json of options this can be passed in as the animation.
    // ====================================================================================================================
    function winwheelAnimation(options)
    {
        // Define default options for animation, all null so the code knows the developer has not specified anything so the
        // defaults will be used instead.
        var defaults = {
            'type'              : 'spinOngoing',
            'direction'         : 'clockwise',
            'propertyName'      : 'rotationAngle',
            'duration'          : 10,
            'yoyo'              : false,
            'repeat'            : 0,
            'easing'            : 'Power3.easeOut',
            'stopAngle'         : null,
            'spins'             : null,
            'clearTheCanvas'    : null,
            'callbackFinished'  : null,
            'callbackBefore'    : null,
            'callbackAfter'     : null,
            'callbackSound'     : null,
            'soundTrigger'      : 'segment'
        };

        // Now loop through the defaults and override with anything passed in.
        for (var key in defaults)
        {
            this[key] = (typeof(options[key]) !== 'undefined') ? options[key] : defaults[key];
        }
    }

    // ====================================================================================================================
    // Called by the wheel constructor to load the wheelImage and then call a callback once loaded.
    // ====================================================================================================================
    function winwheelLoadedImage()
    {
        // Need to call draw on the wheel again to ensure the image is rendered.
        if (this.onloadCallback)
        {
            this.onloadCallback();
        }
    }

    // ====================================================================================================================
    // This function sets up window.onresize event so that when the page is resized the wheel properties are updated
    // and also re-drawn. Code originally contributed by Joarden S. from the Winwheel GitHub.
    // ====================================================================================================================
    function winwheelResize(theWheel)
    {
        // Default to use the original size.
        var cachedWidth  = theWheel.canvas.width;
        var cachedHeight = theWheel.canvas.height;

        // Add event listener.
        window.addEventListener('resize', function()
        {
            // Determine the new scale factor.
            var scaleX = (window.innerWidth / (cachedWidth   + 50));
            var scaleY = (window.innerHeight / (cachedHeight + 50));
            var scale  = (scaleX < scaleY) ? scaleX : scaleY;

            // Re-size the canvas using the scale.
            theWheel.wheelCanvas.width  = cachedWidth  * scale;
            theWheel.wheelCanvas.height = cachedHeight * scale;

            theWheel.scaleFactor = scale;
            theWheel.draw();
        });
    }

    // ====================================================================================================================
    // This function clears the canvas of anything which has been drawn on it.
    // ====================================================================================================================
    function winwheelClearCanvas()
    {
        if (this.clearTheCanvas)
        {
            var ctx = this.ctx;

            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    // ====================================================================================================================
    // This function draws / re-draws the wheel on the canvas therefore rendering any changes.
    // ====================================================================================================================
    function winwheelDraw(clearTheCanvas)
    {
        // If have the canvas context.
        if (this.ctx)
        {
            // Clear the canvas if requested.
            if ((typeof(clearTheCanvas) !== 'undefined') && (clearTheCanvas == false)) {
                // Do not clear the canvas, a developer might be drawing something else on it.
            } else {
                this.clearCanvas();
            }

            // The default draw mode is code, so call function to draw segments if drawMode is 'code'.
            if (this.drawMode == 'code')
            {
                this.drawSegments();
            }
            else if (this.drawMode == 'image')
            {
                // Draw the wheel by loading and drawing an image such as of the wheel designed on the website.
                this.drawWheelImage();
            }

            // If this.drawText is true then draw the text.
            if (this.drawText == true && this.drawMode == 'code')
            {
                this.drawSegmentText();
            }

            // If pins are to be drawn then call function to do so.
            if ((typeof this.pins !== 'undefined') && this.pins && this.pins.visible == true)
            {
                this.drawPins();
            }

            // If pointer guide is display then draw the pointer guide.
            if ((typeof this.pointerGuide !== 'undefined') && this.pointerGuide.display == true)
            {
                this.drawPointerGuide();
            }

            // If we are to draw a pointer we do so at the end.
            if (this.pointerAngle != 0)
            {
                this.drawPointer();
            }
        }
    }

    // ====================================================================================================================
    // This function draws the wheel using its wheelImage.
    // ====================================================================================================================
    function winwheelDrawWheel()
    {
        // Not used in 2.10 (kept for compatibility).
    }

    // ====================================================================================================================
    // This function draws the segments on the wheel using code (which can also draw text if the text properties are set).
    // ====================================================================================================================
    function winwheelDrawSegments()
    {
        // Set up variables.
        var ctx = this.ctx;

        // Draw the segments if there is at least one in the segments array.
        if (this.numSegments > 0)
        {
            // The current arc used to draw the segments.
            var arcAngle = 0;

            // Loop though and draw each segment.
            for (var x = 1; x <= this.numSegments; x ++)
            {
                // Get the segment object as we need it to read options from.
                var seg = this.segments[x];

                // Set the segment start and end angle.
                var startAngle = (Math.PI / 180) * seg.startAngle;
                var endAngle   = (Math.PI / 180) * seg.endAngle;

                // Begin path of segment.
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.outerRadius, startAngle, endAngle, false);

                // Draw the segment if it has a fillStyle.
                if (seg.fillStyle)
                {
                    ctx.fillStyle = seg.fillStyle;
                    ctx.fill();
                }

                // If draw outline is set, then stroke the outline of the segment.
                if (seg.strokeStyle)
                {
                    ctx.strokeStyle = seg.strokeStyle;
                    ctx.lineWidth   = seg.lineWidth;
                    ctx.stroke();
                }
            }
        }
    }

    // ====================================================================================================================
    // This function draws the text for the segments if they have had text assigned to them.
    // ====================================================================================================================
    function winwheelDrawSegmentText()
    {
        // Again check have a ctx to work with.
        if (this.ctx)
        {
            // Declare variables to hold the values. 
            var ctx = this.ctx;

            // Set alignment of the text and font declaration.
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';

            // The draw routine loops though all segments.
            for (var x = 1; x <= this.numSegments; x ++)
            {
                var seg = this.segments[x];

                // See if text is set, if not then skip drawing it.
                if (seg.text)
                {
                    // Set the style and weight of any text.
                    var fontSize    = (seg.textFontSize)    ? seg.textFontSize    : this.textFontSize;
                    var fontFamily  = (seg.textFontFamily)  ? seg.textFontFamily  : this.textFontFamily;
                    var fontWeight  = (seg.textFontWeight)  ? seg.textFontWeight  : this.textFontWeight;
                    var fillStyle   = (seg.textFillStyle)   ? seg.textFillStyle   : this.textFillStyle;
                    var textMargin  = (seg.textMargin)       ? seg.textMargin      : this.textMargin;
                    var orientation = (seg.textOrientation)  ? seg.textOrientation : this.textOrientation;
                    var alignment   = (seg.textAlignment)    ? seg.textAlignment   : this.textAlignment;
                    var direction   = (seg.textDirection)    ? seg.textDirection   : this.textDirection;

                    // ------------------------------
                    // Set font.
                    var fontSetting = '';
                    if (fontWeight) {
                        fontSetting += fontWeight + ' ';
                    }
                    fontSetting += fontSize + 'px ' + fontFamily;
                    ctx.font = fontSetting;

                    // Split the text if multiple lines and write them line by line.
                    var lines = seg.text.split('\n');
                    var lineCount = lines.length;

                    // The starting angle.
                    var segAngle = (seg.endAngle - seg.startAngle);
                    var segCenterAngle = seg.startAngle + (segAngle / 2);

                    var centerAngle = (Math.PI / 180) * segCenterAngle;

                    // Work out the radius at which we will draw the text.
                    var radius = this.outerRadius - textMargin;

                    // For alignment of outer we shift out from the center.
                    if (alignment == 'inner') {
                        radius = this.innerRadius + textMargin;
                    } else if (alignment == 'center') {
                        radius = this.innerRadius + ((this.outerRadius - this.innerRadius) / 2);
                    }

                    for (var i = 0; i < lineCount; i++)
                    {
                        ctx.fillStyle = fillStyle;

                        // If there is a stroke style then set that and draw the stroke of the text.
                        var strokeStyle = (seg.textStrokeStyle) ? seg.textStrokeStyle : this.textStrokeStyle;
                        var lineWidth   = (seg.textLineWidth)   ? seg.textLineWidth   : this.textLineWidth;

                        if (strokeStyle) {
                            ctx.strokeStyle = strokeStyle;
                            ctx.lineWidth   = lineWidth;
                        } else {
                            ctx.strokeStyle = 'none';
                        }

                        // Calculate the angle to draw this line of text at.
                        var lineOffset = (i - (lineCount - 1)/2) * fontSize;
                        var yPos = this.centerY + (Math.sin(centerAngle) * radius) - lineOffset * Math.sin(centerAngle);
                        var xPos = this.centerX + (Math.cos(centerAngle) * radius) - lineOffset * Math.cos(centerAngle);

                        // Set the angle the text should be drawn at and then rotate the canvas to draw.
                        ctx.save();
                        ctx.translate(xPos, yPos);
                        ctx.rotate(centerAngle);
                        ctx.fillText(lines[i], 0, 0);

                        if (strokeStyle) {
                            ctx.strokeText(lines[i], 0, 0);
                        }

                        ctx.restore();
                    }
                }
            }
        }
    }

    // ====================================================================================================================
    // Draw pointer on the canvas, in its simplest form this is just a line at the 12 o'clock position which you can set
    // the line width of. Another possibility is the code here could draw an arrow pointer.
    // ====================================================================================================================
    function winwheelDrawPointer()
    {
        // If we have a canvas context.
        if (this.ctx)
        {
            var ctx = this.ctx;

            // Get angle in radians.
            var angle = (Math.PI / 180) * this.pointerAngle;

            // Draw pointer
            ctx.save();

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.fillStyle = '#ffffff';

            // Translate and rotate so that we can draw the custom pointer
            ctx.translate(this.centerX, this.centerY);
            ctx.rotate(angle);

            // Simple arrow:
            ctx.beginPath();
            ctx.moveTo(this.outerRadius - 20, 0);
            ctx.lineTo(this.outerRadius + 10, 0);
            ctx.lineTo(this.outerRadius, 10);
            ctx.lineTo(this.outerRadius - 20, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }

    // ====================================================================================================================
    // Draw a line from the center of the wheel to the outer edge at the pointerAngle. Useful for debugging.
    // ====================================================================================================================
    function winwheelDrawPointerGuide()
    {
        if (this.ctx)
        {
            var ctx = this.ctx;

            // Get angle in radians.
            var angle = (Math.PI / 180) * this.pointerAngle;

            ctx.save();
            ctx.strokeStyle = this.pointerGuide.strokeStyle;
            ctx.lineWidth   = this.pointerGuide.lineWidth;

            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.lineTo(this.centerX + (this.outerRadius * Math.cos(angle)), this.centerY + (this.outerRadius * Math.sin(angle)));
            ctx.stroke();
            ctx.restore();
        }
    }

    // ====================================================================================================================
    // A very basic drawing of the pin heads by circling around the wheel at evenly spaced out locations.
    // ====================================================================================================================
    window.Winwheel.prototype.drawPins = function()
    {
        // If we have a canvas context.
        if (this.ctx)
        {
            var ctx = this.ctx;

            ctx.save();
            ctx.translate(this.centerX, this.centerY);

            // Draw the pins
            for (var i=1; i <= this.pins.number; i ++)
            {
                var angle = ((360 / this.pins.number) * i) - 90;
                var radians = angle * 0.0174532925199432957;
                var xPos    = (this.outerRadius - this.pins.outerRadius) * Math.cos(radians);
                var yPos    = (this.outerRadius - this.pins.outerRadius) * Math.sin(radians);

                // Set line width and color.
                ctx.lineWidth = this.pins.lineWidth;
                ctx.strokeStyle = this.pins.strokeStyle;
                ctx.fillStyle = this.pins.fillStyle;

                // Now draw a circle.
                ctx.beginPath();
                ctx.arc(xPos, yPos, this.pins.outerRadius, 0, 2*Math.PI);
                ctx.stroke();
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ====================================================================================================================
    // This function starts the spinning.
    // ====================================================================================================================
    function winwheelStartAnimation()
    {
        // This function is called once before the first frame of the animation.
        // Then a property of the animation called the animationLoop is called repeatedly until the animation has finished.
        // Check if the animation has property that is a callback before - if so then call it.
        if (this.animation.callbackBefore) {
            (typeof this.animation.callbackBefore === 'function') ? this.animation.callbackBefore() : eval(this.animation.callbackBefore);
        }

        // Set the animation current step to 0.
        this.animation.currentStep = 0;

        // We need to get the wheel to compute the animation properties.
        this.computeAnimation();

        // If drawMode is image change the draw function used so image is re-rendered.
        if (this.drawMode == 'image') {
            this.draw = this.drawSegments;  // For images, the drawSegments() function actually draws the image.
        } else {
            this.draw = winwheelDraw;       // For code segments, use the normal draw.
        }

        // Now call the animation loop function for the first time.
        this.animationLoop();
    }

    // ====================================================================================================================
    // This is called once each frame of the animation.
    // ====================================================================================================================
    function winwheelAnimationLoop()
    {
        // Double requestAnimationFrame to support some browsers (like Safari).
        var self = this;
        requestAnimationFrame(function() { self.animationLoop() });

        // If the current step has not reached its end, then do the animation,
        // else finish by calling the callback if there is one.
        if (this.animation.currentStep < this.animation.duration)
        {
            // Do the animation for this frame.
            this.animation.currentStep ++;

            // Handle rotation.
            var propertyName = this.animation.propertyName;

            if (propertyName === 'rotationAngle')
            {
                // Work out how much to rotate by this frame.
                var spinAngle = this.animation._totalChangeInAngle * this.animation._easingFunction(this.animation.currentStep / this.animation.duration);

                if (this.animation.direction == 'counterclockwise') {
                    this[propertyName] = (this.animation._startAngle - spinAngle);
                } else {
                    this[propertyName] = (this.animation._startAngle + spinAngle);
                }
            }

            // Other property animations such as alpha or outerRadius could go here...

            // Call draw function to render changes.
            if ((this.animation.clearTheCanvas == true) || ((this.animation.clearTheCanvas == null) && (this.clearTheCanvas == true))) {
                this.clearCanvas();
            }

            this.draw();

            // If there is a sound callback then call it if a segment trigger or pin triggered.
            if (this.animation.callbackSound)
            {
                if (this.animation.soundTrigger == 'segment')
                {
                    // Get the segment the wheel has landed on, check if it's changed.
                    var indicatedSegmentNumber = this.getIndicatedSegmentNumber();
                    if (indicatedSegmentNumber != this.animation._lastSoundTriggerNumber)
                    {
                        this.animation._lastSoundTriggerNumber = indicatedSegmentNumber;
                        (typeof this.animation.callbackSound === 'function') ? this.animation.callbackSound() : eval(this.animation.callbackSound);
                    }
                }
            }
        }
        else
        {
            // This is the final frame of the animation, so set step to the duration (just in case).
            this.animation.currentStep = this.animation.duration;

            // Call draw function to render final position.
            if ((this.animation.clearTheCanvas == true) || ((this.animation.clearTheCanvas == null) && (this.clearTheCanvas == true))) {
                this.clearCanvas();
            }
            this.draw();

            // If there is a callback function for when the animation finishes, call it.
            if (this.animation.callbackFinished) {
                (typeof this.animation.callbackFinished === 'function') ? this.animation.callbackFinished() : eval(this.animation.callbackFinished);
            }
        }
    }

    // ====================================================================================================================
    // This function is used to compute the animation properties before the start of the animation.
    // ====================================================================================================================
    function winwheelComputeAnimation()
    {
        // If the propertyName is rotationAngle, then we need to work out how much to rotate by, etc.
        if (this.animation.propertyName == 'rotationAngle')
        {
            // Set the _startAngle to the wheel's current rotationAngle.
            this.animation._startAngle = this[this.animation.propertyName];

            // Work out the total change in angle if we are spinning in a particular direction.
            if (this.animation.spins) {
                if (this.animation.direction == 'counterclockwise') {
                    this.animation._totalChangeInAngle = (360 * this.animation.spins);
                } else {
                    this.animation._totalChangeInAngle = (360 * this.animation.spins);
                }
            }

            // If stopAngle has been specified then we need to adjust for that.
            if (this.animation.stopAngle !== null)
            {
                // We will spin either clockwise or counterclockwise, so work out the end angle.
                var spins  = this.animation.spins ? this.animation.spins : 1;
                var start  = this.animation._startAngle;
                var stop   = this.animation.stopAngle;

                if (this.animation.direction == 'counterclockwise')
                {
                    // Get a positive difference in angles.
                    var diff = (start >= stop) ? (start - stop) : (start + (360 - stop));
                    this.animation._totalChangeInAngle = (360 * spins) - diff;
                }
                else
                {
                    // Clockwise
                    var diff = (stop >= start) ? (stop - start) : ((360 - start) + stop);
                    this.animation._totalChangeInAngle = (360 * spins) + diff;
                }
            }

            // Easing function
            if (this.animation.easing)
            {
                if (typeof this.animation.easing === 'string')
                {
                    // If a string then see if we have function by that name.
                    this.animation._easingFunction = winwheelEasing[this.animation.easing];

                    // Fallback if not found.
                    if (!this.animation._easingFunction) {
                        this.animation._easingFunction = winwheelEasing.easeOut;
                    }
                }
                else
                {
                    // Assume it is a function and assign it directly.
                    this.animation._easingFunction = this.animation.easing;
                }
            }
            else
            {
                // Use default easeOut if nothing specified.
                this.animation._easingFunction = winwheelEasing.easeOut;
            }

            // If there is a sound callback we need to set the _lastSoundTriggerNumber to be -1 so we can detect a change.
            if (this.animation.callbackSound)
            {
                this.animation._lastSoundTriggerNumber = -1;
            }
        }
    }

    // ====================================================================================================================
    // This is an object that contains various easing functions. Currently only one is used: easeOut.
    // Could add others (easeIn, easeInOut, linear, etc.).
    // ====================================================================================================================
    var winwheelEasing = {
        easeOut: function(t) {
            return 1 - Math.pow(1 - t, 4);
        },
        // A few other possible variants or expansions:
        Power3: {
            easeOut: function(t) {
                return 1 - Math.pow(1 - t, 3);
            }
        }
    };

    // ====================================================================================================================
    // This function stops the animation by setting the animation currentStep to the end. Then calls draw to render.
    // ====================================================================================================================
    function winwheelStopAnimation(canCallback)
    {
        // Set the animation current step to its duration so it will end.
        this.animation.currentStep = this.animation.duration;

        // Call draw to render final position.
        if ((this.animation.clearTheCanvas == true) || ((this.animation.clearTheCanvas == null) && (this.clearTheCanvas == true))) {
            this.clearCanvas();
        }
        this.draw();

        // If canCallback is not false then do the callback.
        if (canCallback !== false)
        {
            if (this.animation.callbackFinished) {
                (typeof this.animation.callbackFinished === 'function') ? this.animation.callbackFinished() : eval(this.animation.callbackFinished);
            }
        }
    }

    // ====================================================================================================================
    // A simple rotate function which takes the wheel's rotationAngle and adds the value passed in.
    // ====================================================================================================================
    function winwheelRotate(angleValue)
    {
        this.rotationAngle += angleValue;
        this.draw();
    }

    // ====================================================================================================================
    // Returns the segment object for the segment which is at the location of the pointerAngle relative to the wheel.
    // ====================================================================================================================
    function winwheelGetIndicatedSegment()
    {
        var indicatedSegment = null;
        var rawAngle = this.getRotationPosition();

        // Now we need to find which segment this angle is in.
        for (var x = 1; x <= this.numSegments; x ++)
        {
            var seg = this.segments[x];

            if ((rawAngle >= seg.startAngle) && (rawAngle <= seg.endAngle))
            {
                indicatedSegment = seg;
                break;
            }
        }

        return indicatedSegment;
    }

    // ====================================================================================================================
    // Returns the number of the segment which is at the location of the pointerAngle relative to the wheel.
    // ====================================================================================================================
    function winwheelGetIndicatedSegmentNumber()
    {
        var indicatedSegmentNumber = 0;
        var rawAngle = this.getRotationPosition();

        for (var x = 1; x <= this.numSegments; x ++)
        {
            var seg = this.segments[x];

            if ((rawAngle >= seg.startAngle) && (rawAngle <= seg.endAngle))
            {
                indicatedSegmentNumber = x;
                break;
            }
        }

        return indicatedSegmentNumber;
    }

    // ====================================================================================================================
    // Returns the current rotation position of the wheel in degrees from 0 to 359.9 repeating.
    // ====================================================================================================================
    window.Winwheel.prototype.getRotationPosition = function()
    {
        var rawAngle = this.rotationAngle;  // Get current rotation angle of wheel.

        // Format to 360 degree format.
        rawAngle = rawAngle % 360;
        if (rawAngle < 0)
            rawAngle = 360 + rawAngle;

        return rawAngle;
    }

})(window);
/* End of Winwheel.js */
