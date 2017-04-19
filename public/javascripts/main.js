(function ($) {
  (function poll() {
    setTimeout(function() {
      $(function() {
        $.ajax({
          url: '/api/online',
          method: 'GET',
          dataType: 'json',
          complete: poll
        }).done(function(data) {
          $('.online').text(data.online)
        })
      })
    }, 1000)
  })()

  $('[data-trigger-modal]:not(.disabled)').on('click', function(e) {
    var modalName = $(e.target).attr('data-trigger-modal')
    var modal = $('.modal[data-modal="'+ modalName +'"]')

    modal.show().fadeIn('slow')
  })

  $('.modal-close').on('click', function(e) {
    var modal = $(e.target).parents('.modal')
    modal.hide()
  })
})(jQuery)
