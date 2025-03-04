<?php
// for ($num = 2; $num <= 100; $num++) {
//     $isPrime = true;
//     for ($i = 2; $i < ; $i++) {
//         if ($num % $i == 0) {
//             $isPrime = false;
//             break;
//         }
//     }
//     if ($isPrime) {
//         echo "$num";
//         echo"<br>";
//     }
// }









for ($num = 2; $num <= 100; $num++) {
    $isPrime = true;
    for ($i = 2; $i < $num ; $i++) {
        if ($num % $i == 0) {
                $isPrime = false;
                echo $num . "<br>";
                break;
        }
    }
    // if ($isPrime) {
    //     echo "$num";
    //     echo"<br>";
    // }
}



?>