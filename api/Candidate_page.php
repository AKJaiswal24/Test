<?php
session_start();



$candidates = $_SESSION['candidates'];
$userdata = $_SESSION['userdata'];

$result = $connect->query("SELECT * FROM candidate");
$totalcandidate = $result->num_rows;

?>




<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Voting System</title>
    <link rel="stylesheet" href="../style.css">
    <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>


</head>

<body>
    <nav class="f_nam">
      <div class="con1">
        <img src="../YCMOU logo.png" alt="">
        <h4>University name</h4>
        <p>YCMOU</p>
      </div>
  
      
      <div class="con2">
      <img src="../logo.png" alt="">
      <p>Online Voting System</p>
      </div>
    </nav>
  <hr>
<form action="vote.php" method="post">
    <div class="cand_container">
        <h1>Candidates</h1>
<?php
     
     if ($_SESSION['candidates']) {
        for($i=0;$i<$totalcandidate;$i++) {
            ?>

    
    <div class="candi">
        <div class="align">

                <?php echo '<img src="../party_icon/'.$candidates[$i]["party_img"] .' "class="cand_img"  >' ?>

            <input class="party_nm" type="hidden" name="party_name"><p><?php echo $candidates[$i]["party_name"];?></p>
            <input type="hidden" name="can_vote"> Votes: <?php echo $candidates[$i]["total_vote"];?>

            <button type="submit" class="vote_btn">
                <div class="icon-wrapper-1">
                    <div class="icon-wrapper">
                        <i class='bx bxs-hand-up bx-flip-horizontal'></i>
                    </div>
                </div>
                <span>Vote</span>
            </button>
        </div>
    </div>    

        
  <?php      }
    } 
     ?>

    </div>
</form>


</body>

</html>