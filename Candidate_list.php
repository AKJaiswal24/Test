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
  <style>
    .candidate_list2{
  background: var(--primary-color-hover);
  border: 1px solid black;
  border-radius: 15px;
  width: 200px;
  font-size: 10px;
  margin: 1.2rem 0;
  /* margin-left: 5rem; */
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
    
    <link rel="stylesheet" href="style.css">
</head>
<body>
    
  <nav class="f_nam">
    
    <div class="con1">
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
        <a href="Note.html">
          <i class="fa-solid fa-bullhorn icon"></i>
          <span class="links_name">Note</span>
        </a>
        <span class="tooltip">Note</span>
      </li>
      <li>
        <a href="Candidate_list.php">
          <i class="fa-solid fa-person"></i>
          <span class="links_name">Candidate</span>
        </a>
        <span class="tooltip">Candidate</span>
      </li>
      <!-- <li>
        <a href="#">
          <i class="fa-solid fa-headset icon"></i>
          <span class="links_name">Customer Support</span>
        </a>
        <span class="tooltip">Customer Support</span>
      </li> -->
    </ul>
  </div>

  
  
  <section class="home-section">
    <center>

      <?php
      if($_SESSION['candidates']){
        for($i=0;$i<$totalcandidate;$i++){
?>          
        <form class="candidate_list2"><div class="inner_contain">
        <h1>Candidates <?php echo $i+1; ?> </h1>
        <hr>
        <div class="members">
            <div class="scandidate ones">
            <?php echo '<img src="party_icon/'.$candidates[$i]["party_img"] .' "class="cand_img" width="150px" >' ?>
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

    <footer>
    <div class="frow">
            <div class="col">
                <img src="logo.png" class="logo" alt="" srcset="">
                <h3>A easy and new way to vote </h3>
            </div>
            <div class="col">
                <h3>Title<div class="underline"><span></span></div> </h3>
                <h4>something</h4>
                <p class="email_id">example1@gmail.com</p>
                <h4>7506168740</h4>
            </div>
            <div class="col">
                <h3>Contact us <div class="underline"><span></span></div> </h3>
                <form action="">
                    <i class='bx bx-envelope'></i>
                    <input type="email" placeholder="Enter your mail id" required>
                    <button type="submit"><i class='bx bxs-right-arrow-alt bx-fade-right'></i></button>
                </form>
            </div>
        </div>
        <hr>
          <p class="rights">online voting system</p>
    </footer>
      
  </section>
</body>
</html>