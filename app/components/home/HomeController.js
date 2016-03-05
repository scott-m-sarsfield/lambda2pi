/*global app, $scope, Lambda2PiTranslator */

app.controller('HomeController', ['$scope', 'HomeService', function ($scope, HomeService) {
    "use strict";

    var translator = new Lambda2PiTranslator();
    $scope.myInput = "";
    $scope.interpretation = "";
    $scope.myOutput = "";
    $scope.myColor = "black";
    
    $scope.$watch('myInput', function () {
        $scope.interpretation = $scope.myInput.replace(/L/g, "λ");
        try {
            $scope.myOutput = translator.translate($scope.myInput);
            $scope.myColor = "black";
        } catch (error) {
            if (error.type === "TranslatorError") {
                $scope.myOutput = error.message;
                $scope.myColor = "red";
            } else {
                throw error;
            }
        }
    });
}]);