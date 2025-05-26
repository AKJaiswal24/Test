<?php
session_start();
include("connect.php");

$result = $connect->query("SELECT * FROM candidate ORDER BY party_name = 'None Of the above (NOTA)';");
$candidates = mysqli_fetch_all($result, MYSQLI_ASSOC);
$_SESSION['candidates'] = $candidates;

$totalcandidate = $result->num_rows;

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>>Online Voting System</title>
    
    <link rel="icon" href="../logo100.png" type="image/png">

    <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">
  <style>
    .candidate_list2{
  background: var(--primary-color-hover);
  border: 1px solid black;
  border-radius: 15px;
  width: 200px;
  font-size: 10px;
  margin: 1.2rem 0;
  padding: 20px;
  box-shadow: 10px 10px 15px rgba(0, 0, 0, 0.4);
}

.scandidate{
  margin: 8px;
  transition: all .3s ease;
  cursor: pointer;
}
.scandidate:hover{
  transform: scale(1.1);
}

  </style>
    
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



  
  <p style="font-size:30px; font-weight: 400; ">Result</p> 
  <div class="griding" style="margin-left: 100px;">

    <?php
      if($_SESSION['candidates']){
        for($i=0;$i<$totalcandidate;$i++){
          ?>

<section class="home-section">
  <center>
    
    <form class="candidate_list2"><div class="inner_contain">
      <h1>Nominee <?php echo $i+1; ?> </h1>
    <hr>
    <div class="members">
      <div class="scandidate ones">
        <?php echo '<img src="../party_icon/'.$candidates[$i]["party_img"] .' "class="cand_img" width="150px" >' ?>
        <h3>Party Name:<?php $nmparty =  $candidates[$i]["party_name"]; echo $nmparty; ?></h3>
        <p class="highlight_txt">vote = <?php $query =mysqli_fetch_assoc( mysqli_query($connect,
        "SELECT COUNT(*) AS count FROM voter_list WHERE party_name = '$nmparty' ")); echo $query['count']; ?></p>
      </div>
    </div>
  </div>
</form>
</center>
</section>
<?php
        }
      } 
      ?>

</div>
<center><a href="admin.html" class="backbtn"><i class='bx bx-left-arrow-alt'></i>Back</a></center>
<div style="height: 250px;"></div>


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
<script src="script.js"></script>
</html>