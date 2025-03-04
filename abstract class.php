<?php

abstract class Vehicle {
    abstract function startEngine();
}

class car extends Vehicle {
    function startEngine() {
        echo "Car engine started.";
    }

    function stopEngine() {
        echo "Car engine stopped.";
    }
}

$car = new car;
$car -> startEngine();
echo"<br>";
$car -> stopEngine();

?>