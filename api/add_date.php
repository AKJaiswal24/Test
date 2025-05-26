<?php

include("connect.php");
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $date = $_POST['date'];
    $state = $_POST['state'];
    $type = $_POST['type'];

    $query = mysqli_query($connect, "INSERT INTO election_dates(State,date,type) VALUES('$state','$date','$type') ");
    if ($query) {
        echo ' <script>
    alert("Added");
    </script>';
    }
}
?>




<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Voting System</title>

    <link rel="icon" href="../logo100.png" type="image/png">

    <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>
    <link rel="stylesheet" href="../style.css">
</head>

<body>


    <nav class="f_nam">
        <div class="con1">
            <img src="../logo.png" alt="">
            <p>Online Voting System</p>
        </div>
    </nav>
    <hr>


    <center>
        <div class="vote_now">
            <form action="" method="post" enctype="multipart/form-data" class="data1" id="data1">
                <div class="title">ADD Voter</div>
                <label>Election State</label>
                <input type="text" name="state" required>
                <label>Election Date </label>
                <input type="date" name="date" required>
                <label>Election Type</label>
                <input type="text" name="type" required>
                <button type="submit" class="user_verify">Save</button>
            </form>
        </div>
    </center>
    <center><a href="admin.html" class="backbtn"><i class='bx bx-left-arrow-alt'></i>Back</a></center>


      <div style="height:250px"></div>
    

    <footer class="footer">
      <div class="frow">
        <div class="col">
          <img src="../logo.png" class="logo" alt="" srcset="">
          <h3>A easy and new way to vote </h3>
        </div>
        <div class="col">
          <h3>Contact us <div class="underline"><span></span></div>
          </h3>
          <p class="email_id">example1@gmail.com</p>
          <h4>1234567890</h4>
        </div>
        <div class="col">
          <h3>About us <div class="underline"><span></span></div>
          <a href="../about.html"><h3>OVS</h3></a>
          </h3>
        </div>
      </div>
      <hr>
      <p class="rights">online voting system</p>
    </footer>

</body>

</html>