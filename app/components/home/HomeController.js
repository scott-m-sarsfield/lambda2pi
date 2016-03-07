/*global app, $scope, Lambda2PiTranslator */

app.controller('HomeController', ['$scope', 'HomeService', function ($scope, HomeService) {
    "use strict";

    $scope.myInput = "";
    $scope.interpretation = "";
    $scope.myOutput = "";
    $scope.myColor = {"color": "black"};
    
    $scope.$watch('myInput', function () {
        $scope.interpretation = $scope.myInput.replace(/L/g, "λ");
        try {
            $scope.myOutput = HomeService.translator.translate($scope.myInput);
            $scope.myColor = {"color": "black"};
        } catch (error) {
            if (error.type === "TranslatorError") {
                $scope.myOutput = error.message;
                $scope.myColor = {"color": "red"};
            } else {
                throw error;
            }
        }
    });
}]);