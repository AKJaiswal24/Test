<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Online Voting System</title>

  <link rel="icon" href="logo100.png" type="image/png">

  <link rel="stylesheet" href="style.css">

  <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">

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
        <a href="index.php">
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
        <a href="Note.php">
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
      <li>
        <a href="voter_details.html">
        <i class='bx bx-detail'></i>
          <span class="links_name">Details</span>
        </a>
        <span class="tooltip">Details</span>
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

    <h1 style="display: flex; align-items: center; justify-content: center;">Your Vote Matters</h1>
    <p>Total votes given </p>
    <div class="livevotecan">
      <button class="livevote" disabled="disabled">
        <?php

        include("api/connect.php");

        $today1 = date("d-m-y");
        $today = date("y-m-d");
        // $today = "2025-03-29";

        $result = mysqli_query($connect, "SELECT SUM(total_vote) AS total_votes FROM candidate;");

        $fetch = mysqli_fetch_array($result);
        $totalcandidatevote = $fetch["total_votes"];
        echo $totalcandidatevote;

        $query = mysqli_query($connect, "SELECT * FROM election_dates WHERE Date='$today' ");
        $checkfetch = mysqli_fetch_array($query);

        if ($checkfetch == NULL) {
          $ann= "No Election's Today";
        }else{
          $statevote = $checkfetch['State'];
          $ann="Today $today1 is Lok Sabha election for the state of $statevote ";
        }


        ?>
      </button>
    </div>
    <hr>

    <marquee behavior="" direction="">
      <h1 class="announce"><?php echo $ann ?></h1>
    </marquee>

    <hr>
    <div class="election_type">
      <a href="form.html"><button class="btna">Lok Sabha</button></a>


      <a href="form.html" class="dis"><button class="btna" disabled>Vidhan Sabha</button></a>


      <a href="form.html" class="dis"><button class="btna" disabled>Nagar Parishad</button></a>
    </div>

    <div class="blankspace"></div>


    <footer class="footer">
      <div class="frow">
        <div class="col">
          <img src="logo.png" class="logo" alt="" srcset="">
          <h3>A easy and new way to vote </h3>
        </div>
        <div class="col">
          <h3>Contact us <div class="underline"><span></span></div>
          </h3>
          <p class="email_id">example1@gmail.com</p>
          <h4>1234567890</h4>
        </div>
        <div class="col">
          <!-- <h3>
            <div class="underline"><span></span></div>
          </h3> -->
        </div>
      </div>
      <hr>
      <p class="rights">online voting system</p>
    </footer>


  </section>



  <script src="script.js"></script>
</body>

</html>