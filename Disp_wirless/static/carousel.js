document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.info-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    let currentSlide = 0;
    const slideCount = slides.length;

    // Función para mostrar el slide actual
    function showSlide(index) {
        // Oculta todos los slides
        slides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Remueve la clase active de todos los dots
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // Muestra el slide actual y activa su dot correspondiente
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    }

    // Event listeners para los botones de navegación
    nextBtn.addEventListener('click', function() {
        currentSlide = (currentSlide + 1) % slideCount;
        showSlide(currentSlide);
    });

    prevBtn.addEventListener('click', function() {
        currentSlide = (currentSlide - 1 + slideCount) % slideCount;
        showSlide(currentSlide);
    });

    // Event listeners para los dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            showSlide(index);
        });
    });

    // Auto-avance del slider cada 5 segundos
    let slideInterval = setInterval(function() {
        currentSlide = (currentSlide + 1) % slideCount;
        showSlide(currentSlide);
    }, 5000);

    // Pausar el auto-avance cuando el mouse está sobre el slider
    const sliderContainer = document.querySelector('.info-slider');
    sliderContainer.addEventListener('mouseenter', function() {
        clearInterval(slideInterval);
    });

    // Reanudar el auto-avance cuando el mouse sale del slider
    sliderContainer.addEventListener('mouseleave', function() {
        slideInterval = setInterval(function() {
            currentSlide = (currentSlide + 1) % slideCount;
            showSlide(currentSlide);
        }, 5000);
    });

    // Mostrar el primer slide al cargar la página
    showSlide(0);
});