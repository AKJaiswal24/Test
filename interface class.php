<?php

interface fruit{
    function method();
}

class apple implements fruit{
    function method(){
        echo "this is a defined function in parent class";
    }

    function method2(){
        echo "this a child class method";
    }
}

$obj = new apple;
$obj -> method();
echo"<br>";
$obj ->method2();