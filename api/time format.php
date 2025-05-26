<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Voting System</title>
    <link rel="stylesheet" href="../style.css">
    <style>
        .cen {
            display: grid;
            place-items: center;
        }
    </style>
</head>

<body>
    <div class="cen">
        <?php
        date_default_timezone_set('Asia/Kolkata');

        $currentHour = (int) date("G");

        if ($currentHour < 9 || $currentHour >= 17) {
            http_response_code(403);
            echo "<h1>We're closed. Come back between 9:00 AM and 5:00 PM.</h1>";
            exit();
        }
        ?>
    </div>
</body>

</html>