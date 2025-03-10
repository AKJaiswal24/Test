<?php
session_start();
include("api/connect.php");

$result = $connect->query("SELECT * FROM candidate");
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

    <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">
    
    <link rel="stylesheet" href="style.css">
</head>
<body>
    
  <nav class="f_nam">
    <div class="con1">
      <img src="YCMOU logo.png" alt="">
      <h4>University name</h4>
      <p>YCMOU</p>
    </div>

    
    <div class="con2">
    <img src="logo.png" alt="">
    <p>Online Voting System</p>
    </div>
  </nav>

  <hr>

  <div class="sidebar">
    <div class="logo-details">
      <div class="logo_name">Online Voting</div>
      <i class='bx bx-menu' id="btn"></i>
    </div>
    <ul class="nav-list">
      <li>
        <i class='bx bx-search'></i>
        <input type="text" placeholder="Search...">
        <span class="tooltip">Search</span>
      </li>
      <li>
        <a href="index.html">
          <i class='bx bx-home'></i>
          <span class="links_name">Home</span>
        </a>
        <span class="tooltip">Home</span>
      </li>
      <li>
        <a href="form.html">
          <i class="fa-solid fa-square-poll-vertical"></i>
          <span class="links_name">Vote Now</span>
        </a>
        <span class="tooltip">Vote Now</span>
      </li>
      <li>
        <a href="#">
          <i class="fa-solid fa-bullhorn icon"></i>
          <span class="links_name">Announcement</span>
        </a>
        <span class="tooltip">Announcement</span>
      </li>
      <li>
        <a href="Candidate_list.php">
          <i class="fa-solid fa-person"></i>
          <span class="links_name">Candidate</span>
        </a>
        <span class="tooltip">Candidate</span>
      </li>
      <li>
        <a href="#">
          <i class="fa-solid fa-headset icon"></i>
          <span class="links_name">Customer Support</span>
        </a>
        <span class="tooltip">Customer Support</span>
      </li>
    </ul>
  </div>


    <center>
      <?php
      if($_SESSION['candidates']){
        for($i=0;$i<$totalcandidate;$i++){
?>          
        <form class="candidate_list"><div class="inner_contain">
        <h1>Candidates <?php echo $i+1; ?> </h1>
        <hr>
        <div class="members">
            <div class="scandidate ones">
            <?php echo '<img src="party_icon/'.$candidates[$i]["party_img"] .' "class="cand_img"  >' ?>
                <h4>Party Name:<?php echo $candidates[$i]["party_name"];?></h4>
                <!-- <p>BCA</p> -->
            </div>
        </div>
        </div>
    </form>
<?php
        }
      } 
      ?>
      </center>
        <section>
            
          </section>
</body>
</html>