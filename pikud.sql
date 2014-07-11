-- phpMyAdmin SQL Dump
-- version 4.0.9deb1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Jul 11, 2014 at 10:46 AM
-- Server version: 5.5.33-1
-- PHP Version: 5.5.6-1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Database: `red`
--

-- --------------------------------------------------------

--
-- Table structure for table `pikud`
--

CREATE TABLE IF NOT EXISTS `pikud` (
  `pikud_id` int(11) NOT NULL,
  `time` datetime NOT NULL,
  `location` varchar(255) CHARACTER SET utf8 NOT NULL,
  PRIMARY KEY (`pikud_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `pikud`
--

INSERT INTO `pikud` (`pikud_id`, `time`, `location`) VALUES
(275, '2014-07-11 10:15:25', 'אשדוד'),
(276, '2014-07-11 10:15:25', 'אשדוד');
