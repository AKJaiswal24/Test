<?php



session_start();
include("connect.php");


// session_start();

    $userdata = $_SESSION['userdata'];

// if (mysqli_num_rows($check) > 0){


    $result = mysqli_query("SELECT dob FROM aadhaar");

// if ($result->num_rows > 0) {
    if (mysqli_num_rows($result) > 0){



//     // output data of each row
    // while($row = $result->fetch_assoc()) {
        $dob = $result["dob"];
        $today = new DateTime();
        $birthDate = new DateTime($dob);
        $age = $today->diff($birthDate)->y;
        echo "Age: " . $age . "<br>";
    // }
} else {
    echo "0 results";
}



?>

<!-- 
<html>
    <body>
    <div class="oneline">
                <p for="">Aadhaar:</p> <p><?php echo $userdata["aadhaar_no"] ?></p>
            </div>
</body>
</html> -->