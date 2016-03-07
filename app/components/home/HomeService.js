/*global app, $scope, Lambda2PiTranslator */

app.factory('HomeService', [function () {
    "use strict";
    var factory = {};
    
    factory.translator = new Lambda2PiTranslator();

    return factory;
}]);