<?php
/**
 * Plugin Name:       Wakeel Chat
 * Plugin URI:        https://github.com/mashraf1997/wakeel
 * Description:       Adds your Wakeel AI assistant chat bubble to every page. Answers customers 24/7, takes orders and bookings.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Wakeel contributors
 * License:           MIT
 * Text Domain:       wakeel-chat
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const WAKEEL_CHAT_OPTION = 'wakeel_chat_url';

/**
 * Normalises the saved address: keeps scheme, host and an optional /b/<name> path.
 */
function wakeel_chat_base_url() {
	$url = trim( (string) get_option( WAKEEL_CHAT_OPTION, '' ) );
	if ( '' === $url ) {
		return '';
	}
	$url = preg_replace( '#/(widget\.js)?/?$#', '', $url );
	return esc_url_raw( $url, array( 'http', 'https' ) );
}

add_action(
	'wp_enqueue_scripts',
	function () {
		$base = wakeel_chat_base_url();
		if ( '' === $base || is_admin() ) {
			return;
		}
		wp_enqueue_script( 'wakeel-chat', $base . '/widget.js', array(), null, array( 'in_footer' => true, 'strategy' => 'async' ) );
	}
);

add_action(
	'admin_init',
	function () {
		register_setting(
			'wakeel_chat',
			WAKEEL_CHAT_OPTION,
			array(
				'type'              => 'string',
				'sanitize_callback' => function ( $value ) {
					$value = esc_url_raw( trim( (string) $value ), array( 'http', 'https' ) );
					return $value;
				},
				'default'           => '',
			)
		);
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page( 'Wakeel Chat', 'Wakeel Chat', 'manage_options', 'wakeel-chat', 'wakeel_chat_settings_page' );
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=wakeel-chat' ) ) . '">' . esc_html__( 'Settings', 'wakeel-chat' ) . '</a>' );
		return $links;
	}
);

function wakeel_chat_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$base = wakeel_chat_base_url();
	?>
	<div class="wrap">
		<h1>Wakeel Chat</h1>
		<p><?php echo esc_html__( 'Paste the address of your Wakeel dashboard. The chat bubble then appears on every page of this site.', 'wakeel-chat' ); ?></p>
		<p dir="rtl"><?php echo esc_html( 'الصق رابط لوحة تحكم وكيل، وفقاعة الشات هتظهر في كل صفحات الموقع.' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'wakeel_chat' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="wakeel_chat_url"><?php echo esc_html__( 'Wakeel address', 'wakeel-chat' ); ?></label></th>
					<td>
						<input type="url" class="regular-text code" id="wakeel_chat_url" name="<?php echo esc_attr( WAKEEL_CHAT_OPTION ); ?>" value="<?php echo esc_attr( get_option( WAKEEL_CHAT_OPTION, '' ) ); ?>" placeholder="https://chat.example.com">
						<p class="description"><?php echo esc_html__( 'For example https://chat.example.com, or https://agency.example.com/b/my-shop in agency mode.', 'wakeel-chat' ); ?></p>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<?php if ( $base ) : ?>
			<p><?php echo esc_html__( 'Connected to', 'wakeel-chat' ); ?> <code><?php echo esc_html( $base ); ?></code> · <a href="<?php echo esc_url( $base . '/' ); ?>" target="_blank" rel="noopener"><?php echo esc_html__( 'Open the Wakeel dashboard', 'wakeel-chat' ); ?></a></p>
		<?php endif; ?>
	</div>
	<?php
}
