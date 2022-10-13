const SKY_CONFIG = {
	Kr         : 0.0035,
	Km         : 0.0012,
	ESun       : 25.0,
	g          : -0.85,
	innerRadius: 100.0,
	outerRadius: 102.5,
	wavelength : [0.650, 0.570, 0.475],
	scaleDepth : 0.25,
};

const TARGET_DISTANCE = 1;
const INTEGRAL_SEGMENTS = 100000;

function AtmosphereTest() {

    this.exec = function() {
        testIntegral();
        testAnalytical();
    }

    function testIntegral() {
        const scaledLength = TARGET_DISTANCE / INTEGRAL_SEGMENTS;
    
        let distance = scaledLength * 0.5;
    
        let frontColor = 0.0;
    
        for (let i = 0; i < INTEGRAL_SEGMENTS; i++) {
            const attenuate = Math.exp(-distance);
    
            frontColor += attenuate * scaledLength;
            distance += scaledLength
        }
        
        alert(`Integral: ${frontColor}`);
    }

    function testAnalytical() {
        let frontColor = 0.0;
    
        const attenuate = 1.0 - Math.exp(-TARGET_DISTANCE);

        frontColor += attenuate;
        
        alert(`Analytical: ${frontColor}`);
    }
}

export default AtmosphereTest;
