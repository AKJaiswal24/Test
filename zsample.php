<?php

// for($i= 2;$i<=100;$i++ ){

// }


class parentClass{
    function __CONSTRUCT(){
        echo "i am a parent class";
    }
}
class childCLass{
    function __CONSTRUCT(){
        parentClass::__CONSTRUCT();
        echo"I am child class";
    }
}

$parentobj = new parentCLass();
$childobj = new childCLass();
?>