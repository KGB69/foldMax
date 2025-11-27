/**
 * CSS3DRenderer - Converted for global THREE namespace
 * Based on THREE.js CSS3DRenderer
 */

(function () {
	'use strict';

	const _position = new THREE.Vector3();
	const _quaternion = new THREE.Quaternion();
	const _scale = new THREE.Vector3();

	/**
	 * CSS3DObject - wraps HTML element as 3D object
	 */
	THREE.CSS3DObject = function (element) {
		THREE.Object3D.call(this);

		element = element || document.createElement('div');

		this.isCSS3DObject = true;
		this.element = element;
		this.element.style.position = 'absolute';
		this.element.style.pointerEvents = 'auto';
		this.element.style.userSelect = 'none';
		this.element.setAttribute('draggable', false);

		var self = this;
		this.addEventListener('removed', function () {
			self.traverse(function (object) {
				if (object.element &&
					object.element instanceof object.element.ownerDocument.defaultView.Element &&
					object.element.parentNode !== null) {
					object.element.remove();
				}
			});
		});
	};

	THREE.CSS3DObject.prototype = Object.create(THREE.Object3D.prototype);
	THREE.CSS3DObject.prototype.constructor = THREE.CSS3DObject;

	/**
	 * CSS3DSprite - CSS3DObject that always faces camera
	 */
	THREE.CSS3DSprite = function (element) {
		THREE.CSS3DObject.call(this, element);
		this.isCSS3DSprite = true;
		this.rotation2D = 0;
	};

	THREE.CSS3DSprite.prototype = Object.create(THREE.CSS3DObject.prototype);
	THREE.CSS3DSprite.prototype.constructor = THREE.CSS3DSprite;

	/**
	 * CSS3DRenderer - renders CSS3D objects
	 */
	THREE.CSS3DRenderer = function (parameters) {
		parameters = parameters || {};

		var _this = this;
		var _width, _height;
		var _widthHalf, _heightHalf;

		var cache = {
			camera: { style: '' },
			objects: new WeakMap()
		};

		var domElement = parameters.element !== undefined ? parameters.element : document.createElement('div');
		domElement.style.overflow = 'hidden';

		this.domElement = domElement;

		var viewElement = document.createElement('div');
		viewElement.style.transformOrigin = '0 0';
		viewElement.style.pointerEvents = 'none';
		domElement.appendChild(viewElement);

		var cameraElement = document.createElement('div');
		cameraElement.style.transformStyle = 'preserve-3d';
		cameraElement.style.pointerEvents = 'none';
		viewElement.appendChild(cameraElement);

		this.getSize = function () {
			return { width: _width, height: _height };
		};

		this.setSize = function (width, height) {
			_width = width;
			_height = height;
			_widthHalf = _width / 2;
			_heightHalf = _height / 2;

			domElement.style.width = width + 'px';
			domElement.style.height = height + 'px';
			viewElement.style.width = width + 'px';
			viewElement.style.height = height + 'px';
			cameraElement.style.width = width + 'px';
			cameraElement.style.height = height + 'px';
		};

		function epsilon(value) {
			return Math.abs(value) < 1e-10 ? 0 : value;
		}

		function getCameraCSSMatrix(matrix) {
			var elements = matrix.elements;
			return 'matrix3d(' +
				epsilon(elements[0]) + ',' +
				epsilon(-elements[1]) + ',' +
				epsilon(elements[2]) + ',' +
				epsilon(elements[3]) + ',' +
				epsilon(elements[4]) + ',' +
				epsilon(-elements[5]) + ',' +
				epsilon(elements[6]) + ',' +
				epsilon(elements[7]) + ',' +
				epsilon(elements[8]) + ',' +
				epsilon(-elements[9]) + ',' +
				epsilon(elements[10]) + ',' +
				epsilon(elements[11]) + ',' +
				epsilon(elements[12]) + ',' +
				epsilon(-elements[13]) + ',' +
				epsilon(elements[14]) + ',' +
				epsilon(elements[15]) +
				')';
		}

		function getObjectCSSMatrix(matrix) {
			var elements = matrix.elements;
			var matrix3d = 'matrix3d(' +
				epsilon(elements[0]) + ',' +
				epsilon(elements[1]) + ',' +
				epsilon(elements[2]) + ',' +
				epsilon(elements[3]) + ',' +
				epsilon(-elements[4]) + ',' +
				epsilon(-elements[5]) + ',' +
				epsilon(-elements[6]) + ',' +
				epsilon(-elements[7]) + ',' +
				epsilon(elements[8]) + ',' +
				epsilon(elements[9]) + ',' +
				epsilon(elements[10]) + ',' +
				epsilon(elements[11]) + ',' +
				epsilon(elements[12]) + ',' +
				epsilon(elements[13]) + ',' +
				epsilon(elements[14]) + ',' +
				epsilon(elements[15]) +
				')';
			return 'translate(-50%,-50%)' + matrix3d;
		}

		function hideObject(object) {
			if (object.isCSS3DObject) object.element.style.display = 'none';
			for (var i = 0, l = object.children.length; i < l; i++) {
				hideObject(object.children[i]);
			}
		}

		function renderObject(object, scene, camera, cameraCSSMatrix) {
			if (object.visible === false) {
				hideObject(object);
				return;
			}

			if (object.isCSS3DObject) {
				var visible = object.layers.test(camera.layers) === true;
				var element = object.element;
				element.style.display = visible === true ? '' : 'none';

				if (visible === true) {
					object.onBeforeRender(_this, scene, camera);

					var style;
					if (object.isCSS3DSprite) {
						var matrix = new THREE.Matrix4();
						var matrix2 = new THREE.Matrix4();

						matrix.copy(camera.matrixWorldInverse);
						matrix.transpose();

						if (object.rotation2D !== 0) matrix.multiply(matrix2.makeRotationZ(object.rotation2D));

						object.matrixWorld.decompose(_position, _quaternion, _scale);
						matrix.setPosition(_position);
						matrix.scale(_scale);

						matrix.elements[3] = 0;
						matrix.elements[7] = 0;
						matrix.elements[11] = 0;
						matrix.elements[15] = 1;

						style = getObjectCSSMatrix(matrix);
					} else {
						style = getObjectCSSMatrix(object.matrixWorld);
					}

					var cachedObject = cache.objects.get(object);
					if (cachedObject === undefined || cachedObject.style !== style) {
						element.style.transform = style;
						var objectData = { style: style };
						cache.objects.set(object, objectData);
					}

					if (element.parentNode !== cameraElement) {
						cameraElement.appendChild(element);
					}

					object.onAfterRender(_this, scene, camera);
				}
			}

			for (var i = 0, l = object.children.length; i < l; i++) {
				renderObject(object.children[i], scene, camera, cameraCSSMatrix);
			}
		}

		this.render = function (scene, camera) {
			var fov = camera.projectionMatrix.elements[5] * _heightHalf;

			if (camera.view && camera.view.enabled) {
				viewElement.style.transform = 'translate(' + (-camera.view.offsetX * (_width / camera.view.width)) + 'px,' + (-camera.view.offsetY * (_height / camera.view.height)) + 'px)';
				viewElement.style.transform += 'scale(' + (camera.view.fullWidth / camera.view.width) + ',' + (camera.view.fullHeight / camera.view.height) + ')';
			} else {
				viewElement.style.transform = '';
			}

			if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
			if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();

			var tx, ty;
			if (camera.isOrthographicCamera) {
				tx = -(camera.right + camera.left) / 2;
				ty = (camera.top + camera.bottom) / 2;
			}

			var scaleByViewOffset = camera.view && camera.view.enabled ? camera.view.height / camera.view.fullHeight : 1;
			var cameraCSSMatrix = camera.isOrthographicCamera ?
				'scale(' + scaleByViewOffset + ')' + 'scale(' + fov + ')' + 'translate(' + epsilon(tx) + 'px,' + epsilon(ty) + 'px)' + getCameraCSSMatrix(camera.matrixWorldInverse) :
				'scale(' + scaleByViewOffset + ')' + 'translateZ(' + fov + 'px)' + getCameraCSSMatrix(camera.matrixWorldInverse);
			var perspective = camera.isPerspectiveCamera ? 'perspective(' + fov + 'px) ' : '';

			var style = perspective + cameraCSSMatrix + 'translate(' + _widthHalf + 'px,' + _heightHalf + 'px)';

			if (cache.camera.style !== style) {
				cameraElement.style.transform = style;
				cache.camera.style = style;
			}

			renderObject(scene, scene, camera, cameraCSSMatrix);
		};
	};

})();
