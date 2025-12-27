import random
from typing import Dict

class TextVariation:
    """Generate varied reply text with link placeholder support"""
    
    # Closings to occasionally add variation
    CLOSINGS = [
        "",  # No closing sometimes
        " 🙏",
        " ❤️",
        "",
        " 🎯",
        "",
    ]
    
    @classmethod
    def generate_reply(
        cls,
        template: str,
        variables: Dict[str, str]
    ) -> str:
        """Generate a reply from template with variable substitution"""
        
        reply = template
        
        # Replace {link} placeholder with actual link if provided
        if '{link}' in reply and variables.get('link'):
            reply = reply.replace('{link}', variables['link'])
        elif '{link}' in reply:
            # If no link provided, remove the placeholder nicely
            reply = reply.replace('{link}', 'the link in my bio')
        
        # Small chance of adding an extra emoji
        if random.random() > 0.7:
            closing = random.choice(cls.CLOSINGS)
            if closing and not reply.rstrip().endswith(tuple('😊🙏❤️🎉💯🔥🚀🎯📎✨🔗💡📌🙌')):
                reply = reply.rstrip() + closing
        
        return reply.strip()
