<?php
include("connect.php");

$aadhaar = $_POST["aadhaarinp"];


$check = mysqli_query($connect, " SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' ");


    $userdata = mysqli_fetch_array($check);

    $statusis= $userdata["vote_status"];

    if($statusis == 1){
        $status = '<button style="background:lightgreen;width: 100px; height: 50px; border-radius: 10px;">Voted</button>';
    }else{
        $status = '<button style="background:red;width: 100px; height: 50px; border-radius: 10px;">Not Voted</button>';
    }
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../style.css">
    <title>Document</title>
</head>
<body>
    
<nav class="f_nam">
      <div class="con1">
        <img src="../logo.png" alt="">
      <p>Online Voting System</p>
      </div>
    </nav>
  <hr>

    <?php echo $status; ?>
</body>
</html>