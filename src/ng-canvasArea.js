(function(angular) {
  'use strict';

  angular.module('ngCanvasArea', [])

  .directive('ngCanvasArea', [function(ngCanvasTemplate) {
    return {
      restrict: 'A',
      scope: {
        'imagepath': '=',
        'points': '=',
        'maxPoints': '='
      },
      transclude: true,
      link: function(scope, element, attrs) {
        scope.$watch('imagepath', function() {
          scope.init();
        });
        scope.$watch('maxPoints', function(newVal) {
          scope.maxPoints = newVal;
        });
        scope.$watch('points', function(newVal) {
          if(newVal && newVal.length == 0) {
            scope.init();
          }
        });
      },
      controller: 'ngCanvasAreaController'
    };
  }])

  .controller('ngCanvasAreaController', ['$scope', '$element',
    function($scope, $element) {

      $scope.init = function() {
        $($element).html("");
        if(!$scope.imagepath) {
          return false;
        }
        $scope.reset = $('<button class="btn btn-warning btn-lg"><span class="glyphicon glyphicon-trash"></span> Clear</button>');
        $scope.canvas = $('<canvas class=\'img-responsive\'>');
        $scope.ctx = $scope.canvas[0].getContext('2d');

        $scope.image = new Image();
        $($scope.image).load(function() {
          $scope.resize();
        });
        $scope.image.src = $scope.imagepath;
        $scope.canvas.css({
          background: 'url(' + $scope.image.src + ')'
        });

        $(document).ready(function() {
          $($element).append('<br>', $scope.canvas, '<br>', $scope.reset);

          $scope.reset.click($scope.resetFunc);
          $($scope.canvas).on("mousedown", $scope.mousedown);
          $($scope.canvas).on('contextmenu', $scope.rightclick);
          $($scope.canvas).on('mouseup', $scope.stopdrag);
        });
      };

      function Point(x, y) {
        this.x = x;
        this.y = y;
      }

      Point.prototype.equals = function(p) {
        return this.x == p.x && this.y == p.y;
      };

      Point.prototype.distance = function(p) {
        return Math.sqrt(Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2));
      };

      $scope.resize = function() {
        $scope.canvas.attr('height', $scope.image.height).attr('width', $scope.image.width);
        $scope.draw();
      };

      $scope.resetFunc = function() {
        $scope.points = [];
        $scope.$apply();
        $scope.draw();
      };

      $scope.draw = function() {
        $scope.ctx.canvas.width = $scope.ctx.canvas.width;

        if (!$scope.points || $scope.points.length < 1) {
          return false;
        }
        $scope.ctx.globalCompositeOperation = 'destination-over';
        $scope.ctx.fillStyle = 'rgb(255,255,255)'
        $scope.ctx.strokeStyle = 'rgb(20,255,20)';
        $scope.ctx.lineWidth = 1;

        $scope.ctx.beginPath();
        $scope.ctx.moveTo($scope.points[0].x, $scope.points[0].y);
        for (var i = 0; i < $scope.points.length; i += 1) {
          $scope.ctx.fillRect($scope.points[i].x - 2, $scope.points[i].y - 2, 4, 4);
          $scope.ctx.strokeRect($scope.points[i].x - 2, $scope.points[i].y - 2, 4, 4);
          if ($scope.points.length > 1) {
            $scope.ctx.lineTo($scope.points[i].x, $scope.points[i].y);
          }
        }
        $scope.ctx.closePath();
        $scope.ctx.fillStyle = 'rgba(0,255,0,0.1)';
        $scope.ctx.fill();
        $scope.ctx.stroke();
      };

      $scope.move = function(e) {
        if (!e.offsetX) {
          e.offsetX = (e.pageX - $(e.target).offset().left);
          e.offsetY = (e.pageY - $(e.target).offset().top);
        }
        $scope.points[$scope.activePoint] = new Point(Math.round(e.offsetX), Math.round(e.offsetY));
        $scope.draw();
      };

      $scope.rightclick = function(e) {
        e.preventDefault();
        if (!e.offsetX) {
          e.offsetX = (e.pageX - $(e.target).offset().left);
          e.offsetY = (e.pageY - $(e.target).offset().top);
        }
        var x = e.offsetX,
          y = e.offsetY;
        for (var i = 0; i < $scope.points.length; i += 1) {
          dis = Math.sqrt(Math.pow(x - $scope.points[i], 2) + Math.pow(y - $scope.points[i + 1], 2));
          if (dis < 6) {
            $scope.points.splice(i, 1);
            $scope.draw();
            return false;
          }
        }
        return false;
      };

      $scope.stopdrag = function() {
        $(this).off('mousemove');
        $scope.activePoint = null;
        $scope.points = $scope.convexHull($scope.points);
        $scope.$apply();
        $scope.draw();
      };

      $scope.mousedown = function(e) {
        var x, y, dis, lineDis, insertAt = $scope.points.length;

        if (e.which === 3) {
          return false;
        }

        e.preventDefault();
        if (!e.offsetX) {
          e.offsetX = (e.pageX - $(e.target).offset().left);
          e.offsetY = (e.pageY - $(e.target).offset().top);
        }
        x = e.offsetX;
        y = e.offsetY;

        for (var i = 0; i < $scope.points.length; i += 1) {
          dis = Math.sqrt(Math.pow(x - $scope.points[i].x, 2) + Math.pow(y - $scope.points[i].y, 2));
          if (dis < 6) {
            $scope.activePoint = i;
            $(this).on('mousemove', $scope.move);
            return false;
          }
        }

        if ($scope.points.length < $scope.maxPoints) {
          $scope.points.splice(insertAt, 0, new Point(Math.round(x), Math.round(y)));
          $scope.activePoint = insertAt;
          $scope.$apply();
          $(this).on('mousemove', $scope.move);
        }

        if ($scope.points.length == $scope.maxPoints) {
          $scope.points = $scope.convexHull($scope.points);
        }

        $scope.draw();

        return false;
      };

      $scope.convexHull = function(points) {
        function left_oriented(p1, p2, candidate) {
          var det = (p2.x - p1.x) * (candidate.y - p1.y) - (candidate.x - p1.x) * (p2.y - p1.y);
          if (det > 0) return true;
          if (det < 0) return false;
          p1 = new Point(p1.x, p1.y);
          p2 = new Point(p2.x, p2.y);
          return p1.distance(candidate) > p1.distance(p2);
        }

        var N = points.length;
        var hull = [];

        var min = 0;
        for (var i = 1; i != N; i++) {
          if (points[i].y < points[min].y) min = i;
        }
        var hull_point = new Point(points[min].x, points[min].y);

        do {
          hull.push(hull_point);

          var end_point = new Point(points[0].x, points[0].y);

          for (var i = 1; i != N; i++) {
            if (hull_point.equals(end_point) || left_oriented(hull_point,
                end_point,
                points[i])) {
              end_point = new Point(points[i].x, points[i].y);
            }
          }
          hull_point = end_point;
        }
        while (!end_point.equals(hull[0]));
        hull = hull.map(function(point) {
          return {
            'x': point.x,
            'y': point.y
          }
        });
        return hull;
      };
    }
  ]);


})(angular);
