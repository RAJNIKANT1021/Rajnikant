



var tl=gsap.timeline();

tl.from(".logo,.nav-links li",{
  opacity:0,
  y:-50,
  duration:.4,
   stagger:0.1,

})

tl.from("#profile .section__text p,#profile .section__text h1,#profile .section__pic-container img,#profile .section__text .btn-container,#profile .section__text #socials-container img",{
  opacity:0,
  scale:0.4,
  duration:.5,
  
   stagger:0.2,

})

tl.from("#about .section-container .section__pic-container,#about .section-container .about-details-container .details-container,#about .section-container .about-details-container .text-container",{
  opacity:0,
  scale:0.25,
  duration:.3,
  
   stagger:0.2,
   scrollTrigger:{
             //element we r triggering
trigger:"#about .section-container",
scroller:"body",
//         /markers are helping hand
//  markers:true,
 end:"top 40%",
//         //scroll key sath animate kro
       scrub:2,



   }

})
tl.from("#experience .experience-details-container .details-container, #experience .experience-details-container .details-container article",{
  opacity:0,
  scale:0.25,
  duration:1,
  
   stagger:0.4,
   scrollTrigger:{
             //element we r triggering
trigger:"#experience",
scroller:"body",
// start:"top 40%",
//         /markers are helping hand
//  markers:true,
   end:"top -5%",
//         //scroll key sath animate kro
       scrub:2,



   }

})

tl.from("#projects .experience-details-container .about-containers .color-container,#projects .experience-details-container .about-containers .color-container .article-container img",{
  opacity:0,
  scale:0.25,
  duration:1,
  
   stagger:0.4,
   scrollTrigger:{
             //element we r triggering
trigger:"#experience",
scroller:"body",
// start:"top 40%",
//         /markers are helping hand
//  markers:true,
  //  end:"top -5%",
//         //scroll key sath animate kro
       scrub:2,



   }

})




function toggleMenu() {
  const menu = document.querySelector(".menu-links");
  const icon = document.querySelector(".hamburger-icon");
  menu.classList.toggle("open");
  icon.classList.toggle("open");
}

gsap.to(".arrow",{
y:10,
yoyo:true,
repeat:-1,
duration:0.4,
})
