-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db:3306
-- Generation Time: Mar 20, 2026 at 04:46 AM
-- Server version: 8.4.8
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `event_management`
--
CREATE DATABASE IF NOT EXISTS `event_management` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `event_management`;

-- --------------------------------------------------------

--
-- Table structure for table `EVENTS`
--

CREATE TABLE `EVENTS` (
  `event_id` int NOT NULL,
  `event_name` varchar(255) NOT NULL,
  `event_date` date NOT NULL,
  `event_time` time NOT NULL,
  `event_location` varchar(255) NOT NULL,
  `event_capacity` int NOT NULL,
  `event_description` text,
  `event_image` varchar(255) DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `EVENTS`
--

INSERT INTO `EVENTS` (`event_id`, `event_name`, `event_date`, `event_time`, `event_location`, `event_capacity`, `event_description`, `event_image`, `created_by_user_id`, `created_at`, `updated_at`) VALUES
(2, 'sinning', '2569-11-29', '18:42:00', 'ห้อง bank 888', 8, 'sing and dance', '/uploads/event-1773981783332-669089274.jpg', 3, '2026-03-18 15:50:14', '2026-03-20 04:43:03'),
(6, 'see a bird', '2026-03-15', '18:00:00', 'ku kps park', 5, 'see bird and see something and see women', '/uploads/event-1773981774121-587726122.jpg', 5, '2026-03-18 16:42:19', '2026-03-20 04:42:54');

-- --------------------------------------------------------

--
-- Table structure for table `registrations`
--

CREATE TABLE `registrations` (
  `registration_id` int NOT NULL,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `food_allergies` text,
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `registration_status` enum('pending','approved','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `registrations`
--

INSERT INTO `registrations` (`registration_id`, `event_id`, `user_id`, `first_name`, `last_name`, `gender`, `age`, `food_allergies`, `registration_date`, `registration_status`, `created_at`, `updated_at`) VALUES
(9, 6, 6, 'wuttisak', 'kamlangying', 'ชาย', 20, 'no', '2026-03-18 17:34:04', 'pending', '2026-03-18 17:34:04', '2026-03-18 17:34:04'),
(10, 6, 2, 'sivanet', 'kitkongkhachorn', 'ชาย', 20, 'no', '2026-03-18 21:53:47', 'pending', '2026-03-18 21:53:47', '2026-03-18 21:53:47'),
(11, 2, 2, 'sivanet', 'kitkongkhachorn', 'ชาย', 20, 'no', '2026-03-18 21:54:15', 'pending', '2026-03-18 21:54:15', '2026-03-18 21:54:15'),
(12, 6, 7, 'gggg', 'gggg', 'อื่นๆ', 99, 'no', '2026-03-18 21:54:45', 'pending', '2026-03-18 21:54:45', '2026-03-18 21:54:45'),
(13, 6, 1, 'admin', 'admin', 'อื่นๆ', 99, 'no', '2026-03-18 21:55:19', 'pending', '2026-03-18 21:55:19', '2026-03-18 21:55:19'),
(14, 6, 8, 'fafafafa', 'fafafafa', 'อื่นๆ', 99, 'no', '2026-03-18 22:16:45', 'pending', '2026-03-18 22:16:45', '2026-03-18 22:16:45');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `user_email` varchar(100) NOT NULL,
  `user_phone` varchar(20) DEFAULT NULL,
  `user_password` varchar(255) NOT NULL,
  `user_role` enum('admin','participant') DEFAULT 'participant',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `user_name`, `user_email`, `user_phone`, `user_password`, `user_role`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@eventhub.local', NULL, 'admin1234', 'admin', '2026-03-18 15:08:18', '2026-03-18 21:51:12'),
(2, 'sivanet', 'bank12345@gmail.com', '0864030835', 'bank12345', 'participant', '2026-03-18 15:39:16', '2026-03-18 21:51:29'),
(6, 'wuttisak', 'wuttisak@gmail.com', '2323555678', 'wuttisak12345', 'participant', '2026-03-18 15:59:20', '2026-03-18 15:59:20'),
(7, 'gggg', 'gggg@gmail.com', '123 456 7890', 'gggg12345', 'participant', '2026-03-18 17:42:44', '2026-03-18 17:42:44'),
(8, 'fafafafa', 'fafafafa@gmail.com', '0009998765', 'fafafafa12345', 'participant', '2026-03-18 22:16:27', '2026-03-18 22:16:27');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `EVENTS`
--
ALTER TABLE `EVENTS`
  ADD PRIMARY KEY (`event_id`);

--
-- Indexes for table `registrations`
--
ALTER TABLE `registrations`
  ADD PRIMARY KEY (`registration_id`),
  ADD UNIQUE KEY `unique_registration` (`event_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `user_email` (`user_email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `EVENTS`
--
ALTER TABLE `EVENTS`
  MODIFY `event_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `registrations`
--
ALTER TABLE `registrations`
  MODIFY `registration_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `registrations`
--
ALTER TABLE `registrations`
  ADD CONSTRAINT `registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `EVENTS` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `registrations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
